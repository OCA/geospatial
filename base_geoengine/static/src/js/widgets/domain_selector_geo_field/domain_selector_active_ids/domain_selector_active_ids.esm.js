/** @odoo-module **/

/**
 * Copyright 2023 ACSONE SA/NV
 */

import {DomainField} from "@web/views/fields/domain/domain_field";
import {DomainSelector} from "@web/core/domain_selector/domain_selector";
import {TreeEditor} from "@web/core/tree_editor/tree_editor";
import {_t} from "@web/core/l10n/translation";
import {patch} from "@web/core/utils/patch";
import {treeProcessorService} from "@web/core/tree_editor/tree_processor";
import {useSubEnv} from "@web/owl2/utils";

/**
 * The domain of a vector layer (geoengine.vector.layer, model_domain) can restrict
 * its records to the ones displayed in the geoengine view with
 * ("id", "in active_ids", "{ACTIVE_IDS}"): the renderer replaces the
 * placeholder by the displayed ids (see evalModelDomain).
 */
export const ACTIVE_IDS_VALUE = "{ACTIVE_IDS}";

const ACTIVE_IDS_OPERATOR_LABELS = {
    "in active_ids": _t("is in the displayed records"),
    "not in active_ids": _t("is not in the displayed records"),
};

const ACTIVE_IDS_REGEX = /(["'])(not )?in active_ids\1(\s*,\s*)(["'])\{ACTIVE_IDS\}\4/g;

function isActiveIdsOperator(operator) {
    return typeof operator === "string" && operator in ACTIVE_IDS_OPERATOR_LABELS;
}

/**
 * Replace the active_ids conditions by their equivalent on an empty list of
 * ids, so that the domain can be evaluated and validated by the server.
 * @param {String} domain
 * @returns {String}
 */
export function replaceActiveIds(domain) {
    return domain.replace(ACTIVE_IDS_REGEX, '"$2in"$3[]');
}

/**
 * Hook to call in the setup of a component rendering a domain selector for
 * the domain of a vector layer.
 */
export function useActiveIdsOperators() {
    useSubEnv({geoengineActiveIdsOperators: true});
}

patch(DomainSelector.prototype, {
    getOperatorEditorInfo(fieldDef) {
        const info = super.getOperatorEditorInfo(fieldDef);
        if (!this.env.geoengineActiveIdsOperators || fieldDef?.type !== "integer") {
            return info;
        }
        const activeIdsOptions = Object.entries(ACTIVE_IDS_OPERATOR_LABELS);
        return {
            ...info,
            extractProps: ({update, value: [operator, negate]}) => {
                const isActiveIds = isActiveIdsOperator(operator);
                const props = info.extractProps({
                    update,
                    value: isActiveIds
                        ? [info.defaultValue(), false]
                        : [operator, negate],
                });
                return {
                    ...props,
                    value: isActiveIds ? operator : props.value,
                    options: [...props.options, ...activeIdsOptions],
                };
            },
            isSupported: ([operator, negate]) =>
                isActiveIdsOperator(operator)
                    ? !negate
                    : info.isSupported([operator, negate]),
            stringify: ([operator, negate]) =>
                isActiveIdsOperator(operator) && !negate
                    ? ACTIVE_IDS_OPERATOR_LABELS[operator]
                    : info.stringify([operator, negate]),
        };
    },
});

patch(TreeEditor.prototype, {
    getValueEditorInfo(node) {
        if (isActiveIdsOperator(node.operator)) {
            return {
                component: null,
                extractProps: null,
                isSupported: (value) => value === ACTIVE_IDS_VALUE,
                defaultValue: () => ACTIVE_IDS_VALUE,
                message: _t("Value not supported"),
                stringify: (value) => String(value),
            };
        }
        return super.getValueEditorInfo(node);
    },

    _updateLeafOperator(node, operator, negate) {
        super._updateLeafOperator(node, operator, negate);
        if (isActiveIdsOperator(operator)) {
            node.value = ACTIVE_IDS_VALUE;
        }
    },
});

patch(DomainField.prototype, {
    setup() {
        super.setup();
        if (this.props.record.resModel === "geoengine.vector.layer") {
            useActiveIdsOperators();
        }
    },

    getEvaluatedDomain(props = this.props) {
        const domain = this.getDomain(props);
        if (!domain.includes(ACTIVE_IDS_VALUE)) {
            return super.getEvaluatedDomain(props);
        }
        // Count and validate the records on an empty list of displayed ids
        return super.getEvaluatedDomain({
            ...props,
            record: {data: {[props.name]: replaceActiveIds(domain)}},
        });
    },
});

/**
 * Describe the active_ids conditions in the read-only domain selector.
 */
patch(treeProcessorService, {
    start(env, services) {
        const treeProcessor = super.start(env, services);
        const {makeGetConditionDescription} = treeProcessor;

        async function makeGetActiveIdsConditionDescription(...args) {
            const getConditionDescription = await makeGetConditionDescription(...args);
            return (node) => {
                const description = getConditionDescription(node);
                if (!isActiveIdsOperator(node.operator) || node.negate) {
                    return description;
                }
                return {
                    ...description,
                    operatorDescription: ACTIVE_IDS_OPERATOR_LABELS[node.operator],
                    valueDescription: null,
                };
            };
        }

        return {
            ...treeProcessor,
            makeGetConditionDescription: makeGetActiveIdsConditionDescription,
        };
    },
});
