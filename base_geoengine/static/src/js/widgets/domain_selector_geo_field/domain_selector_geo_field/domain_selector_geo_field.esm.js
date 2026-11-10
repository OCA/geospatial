/** @odoo-module **/

/**
 * Copyright 2023 ACSONE SA/NV
 */

import {
    DomainSelectorGeoFieldInput,
    getRecordIds,
    isGeoValue,
    loadGeoReferenceModels,
    makeGeoValue,
    parseGeoValue,
} from "../domain_selector_geo_field_input/domain_selector_geo_field_input.esm";
import {Domain} from "@web/core/domain";
import {DomainSelector} from "@web/core/domain_selector/domain_selector";
import {Select} from "@web/core/tree_editor/tree_editor_components";
import {TreeEditor} from "@web/core/tree_editor/tree_editor";
import {_t} from "@web/core/l10n/translation";
import {getOperatorLabel} from "@web/core/tree_editor/tree_editor_operator_editor";
import {patch} from "@web/core/utils/patch";
import {treeProcessorService} from "@web/core/tree_editor/tree_processor";

export const GEO_FIELD_TYPES = [
    "geo_point",
    "geo_multi_point",
    "geo_line",
    "geo_multi_line",
    "geo_polygon",
    "geo_multi_polygon",
];

const GEO_OPERATOR_LABELS = {
    geo_intersect: _t("intersects"),
    geo_within: _t("is within"),
    geo_contains: _t("contains"),
    geo_touch: _t("touches"),
    geo_equal: _t("is geometrically equal to"),
    geo_greater: _t("has a larger area than"),
    geo_lesser: _t("has a smaller area than"),
};

const GEO_NEGATED_OPERATOR_LABELS = {
    geo_intersect: _t("does not intersect"),
    geo_within: _t("is not within"),
    geo_contains: _t("does not contain"),
    geo_touch: _t("does not touch"),
    geo_equal: _t("is not geometrically equal to"),
    geo_greater: _t("does not have a larger area than"),
    geo_lesser: _t("does not have a smaller area than"),
};

const GEO_FIELD_OPERATORS = [...Object.keys(GEO_OPERATOR_LABELS), "set", "not set"];

// Negated geo conditions ("!", (field, geo_operator, value)) are selected
// through keys prefixed by "!"
const NEGATION_PREFIX = "!";

function isGeoField(fieldDef) {
    return GEO_FIELD_TYPES.includes(fieldDef?.type);
}

function isGeoOperator(operator) {
    return typeof operator === "string" && operator in GEO_OPERATOR_LABELS;
}

function getGeoOperatorLabel(operator, fieldDef, negate = false) {
    if (isGeoOperator(operator)) {
        return negate
            ? GEO_NEGATED_OPERATOR_LABELS[operator]
            : GEO_OPERATOR_LABELS[operator];
    }
    return getOperatorLabel(operator, fieldDef?.type, negate);
}

/**
 * Operator editor of the domain selector for geo fields: the geo operators
 * handled by the ORM (see expressions.py), their negation and "is set" /
 * "is not set".
 * @param {Object} fieldDef
 * @returns {Object}
 */
function getGeoOperatorEditorInfo(fieldDef) {
    const options = [];
    for (const operator of GEO_FIELD_OPERATORS) {
        options.push([operator, getGeoOperatorLabel(operator, fieldDef)]);
        if (isGeoOperator(operator)) {
            options.push([
                `${NEGATION_PREFIX}${operator}`,
                getGeoOperatorLabel(operator, fieldDef, true),
            ]);
        }
    }
    return {
        component: Select,
        extractProps: ({update, value: [operator, negate]}) => ({
            value: negate ? `${NEGATION_PREFIX}${operator}` : operator,
            update: (key) => {
                if (key.startsWith(NEGATION_PREFIX)) {
                    update(key.slice(NEGATION_PREFIX.length), true);
                } else {
                    update(key, false);
                }
            },
            options,
        }),
        defaultValue: () => GEO_FIELD_OPERATORS[0],
        isSupported: ([operator, negate]) =>
            GEO_FIELD_OPERATORS.includes(operator) &&
            (!negate || isGeoOperator(operator)),
        message: _t("Operator not supported"),
        stringify: ([operator, negate]) =>
            getGeoOperatorLabel(operator, fieldDef, negate),
    };
}

/**
 * Value editor of the domain selector for the geo operators.
 * @param {String} resModel
 * @returns {Object}
 */
function getGeoValueEditorInfo(resModel) {
    return {
        component: DomainSelectorGeoFieldInput,
        extractProps: ({value, update}) => ({value, update, resModel}),
        isSupported: isGeoValue,
        defaultValue: () => makeGeoValue(),
        message: _t("Value not supported"),
        stringify: (value) => String(value),
    };
}

patch(DomainSelector.prototype, {
    getDefaultOperator(fieldDef) {
        if (isGeoField(fieldDef)) {
            return GEO_FIELD_OPERATORS[0];
        }
        return super.getDefaultOperator(fieldDef);
    },

    getOperatorEditorInfo(fieldDef) {
        if (isGeoField(fieldDef)) {
            return getGeoOperatorEditorInfo(fieldDef);
        }
        return super.getOperatorEditorInfo(fieldDef);
    },
});

patch(TreeEditor.prototype, {
    getValueEditorInfo(node) {
        if (isGeoOperator(node.operator) && isGeoField(this.getFieldDef(node.path))) {
            return getGeoValueEditorInfo(this.props.resModel);
        }
        return super.getValueEditorInfo(node);
    },

    async _updatePath(node, path) {
        await super._updatePath(node, path);
        if (isGeoOperator(node.operator)) {
            node.value = makeGeoValue();
        }
    },

    _updateLeafOperator(node, operator, negate) {
        const previousValue = node.value;
        super._updateLeafOperator(node, operator, negate);
        if (isGeoOperator(operator)) {
            node.value = isGeoValue(previousValue) ? previousValue : makeGeoValue();
        }
    },
});

function getGeoConditions(tree) {
    if (tree.type === "condition") {
        return isGeoOperator(tree.operator) ? [tree] : [];
    }
    if (tree.type === "connector") {
        return tree.children.flatMap(getGeoConditions);
    }
    return [];
}

/**
 * The search facets and the read-only domain selector describe the conditions
 * with labels of the standard operators only: describe the geo conditions
 * here and delegate everything else to the standard implementation.
 */
patch(treeProcessorService, {
    dependencies: [...treeProcessorService.dependencies, "orm"],

    start(env, services) {
        const treeProcessor = super.start(env, services);
        const {field: fieldService, name: nameService, orm} = services;
        const {getDomainTreeDescription, makeGetConditionDescription} = treeProcessor;

        async function getGeoValueDescription(resModel, value, describeTree) {
            const geoValue = parseGeoValue(value);
            if (geoValue?.mode === "geometry") {
                return geoValue.geometry;
            }
            if (!geoValue?.resModel) {
                return String(value);
            }
            const referenceModels = await loadGeoReferenceModels(orm, resModel);
            const info = referenceModels.find(
                (model) => model.model === geoValue.resModel
            );
            const modelName = info?.name || geoValue.resModel;
            const recordIds = getRecordIds(geoValue.domain);
            if (recordIds && !recordIds.length) {
                return modelName;
            }
            if (recordIds) {
                const displayNames = await nameService.loadDisplayNames(
                    geoValue.resModel,
                    recordIds
                );
                const names = recordIds.map((id) =>
                    typeof displayNames[id] === "string" ? displayNames[id] : String(id)
                );
                return `${modelName} (${names.join(", ")})`;
            }
            const subTree = await treeProcessor.treeFromDomain(
                geoValue.resModel,
                new Domain(geoValue.domain)
            );
            const subDescription = await describeTree(geoValue.resModel, subTree);
            return `${modelName} (${subDescription})`;
        }

        async function getGeoDomainTreeDescription(
            resModel,
            tree,
            isSubExpression = false,
            ...args
        ) {
            if (!getGeoConditions(tree).length) {
                return getDomainTreeDescription(
                    resModel,
                    tree,
                    isSubExpression,
                    ...args
                );
            }
            if (tree.type === "connector") {
                const childDescriptions = await Promise.all(
                    tree.children.map((child) =>
                        getGeoDomainTreeDescription(resModel, child, true, ...args)
                    )
                );
                const separator = tree.value === "&" ? _t("and") : _t("or");
                let description = childDescriptions.join(` ${separator} `);
                if (isSubExpression || tree.negate) {
                    description = `( ${description} )`;
                }
                if (tree.negate) {
                    description = `! ${description}`;
                }
                return description;
            }
            const [{displayNames}, valueDescription] = await Promise.all([
                fieldService.loadPathDescription(resModel, tree.path),
                getGeoValueDescription(
                    resModel,
                    tree.value,
                    getGeoDomainTreeDescription
                ),
            ]);
            const operatorLabel = getGeoOperatorLabel(tree.operator, null, tree.negate);
            return `${displayNames.join(" \u2794 ")} ${operatorLabel} ${valueDescription}`;
        }

        async function makeGetGeoConditionDescription(resModel, tree, ...args) {
            const valueDescriptions = new Map();
            const [getConditionDescription] = await Promise.all([
                makeGetConditionDescription(resModel, tree, ...args),
                ...getGeoConditions(tree).map(async (node) => {
                    valueDescriptions.set(
                        String(node.value),
                        await getGeoValueDescription(
                            resModel,
                            node.value,
                            getGeoDomainTreeDescription
                        )
                    );
                }),
            ]);
            return (node) => {
                const description = getConditionDescription(node);
                if (!isGeoOperator(node.operator)) {
                    return description;
                }
                return {
                    ...description,
                    operatorDescription: getGeoOperatorLabel(
                        node.operator,
                        null,
                        node.negate
                    ),
                    valueDescription: {
                        values: [valueDescriptions.get(String(node.value))],
                        join: "",
                        addParenthesis: false,
                    },
                };
            };
        }

        return {
            ...treeProcessor,
            getDomainTreeDescription: getGeoDomainTreeDescription,
            makeGetConditionDescription: makeGetGeoConditionDescription,
        };
    },
});
