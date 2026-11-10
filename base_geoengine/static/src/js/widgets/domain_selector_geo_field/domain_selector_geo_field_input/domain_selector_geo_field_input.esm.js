/** @odoo-module **/

/**
 * Copyright 2023 ACSONE SA/NV
 */

import {
    Component,
    onWillStart,
    onWillUpdateProps,
    proxy,
    t,
    usePlugin,
    useProps,
} from "@odoo/owl";
import {useOwnedDialogs, useService} from "@web/core/utils/hooks";
import {DebugModePlugin} from "@web/core/debug_mode_plugin";
import {Domain} from "@web/core/domain";
import {DomainSelectorGeoFieldDialog} from "../domain_selector_geo_field_dialog/domain_selector_geo_field_dialog.esm";
import {Expression} from "@web/core/tree_editor/condition_tree";
import {MultiRecordSelector} from "@web/core/record_selectors/multi_record_selector";
import {Select} from "@web/core/tree_editor/tree_editor_components";
import {_t} from "@web/core/l10n/translation";
import {formatAST} from "@web/core/py_js/py";

let referenceModelsPromise = null;

/**
 * Load (once) the models having geo fields that can be used as reference in
 * an indirect geo condition.
 * @param {*} orm
 * @param {String} resModel
 * @returns {Promise<Array>}
 */
export function loadGeoReferenceModels(orm, resModel) {
    if (!referenceModelsPromise) {
        referenceModelsPromise = orm
            .call(resModel, "get_geo_reference_models", [])
            .catch((error) => {
                referenceModelsPromise = null;
                throw error;
            });
    }
    return referenceModelsPromise;
}

/**
 * Parse the right operand of a geo condition. It is either a geometry
 * (WKT/GeoJSON string) or a reference to the records of another model
 * ({"<model>.<geo field>": <domain>}), kept as a python dict expression.
 * @param {*} value
 * @returns {Object|null}
 */
export function parseGeoValue(value) {
    if (typeof value === "string") {
        return {mode: "geometry", geometry: value};
    }
    if (!(value instanceof Expression)) {
        return null;
    }
    const ast = value.toAST();
    // 11: python dictionary
    if (ast.type !== 11) {
        return null;
    }
    const keys = Object.keys(ast.value);
    if (keys.length > 1) {
        return null;
    }
    const key = keys[0] || "";
    const index = key.lastIndexOf(".");
    return {
        mode: "records",
        resModel: key ? key.substring(0, index) : "",
        fieldName: key ? key.substring(index + 1) : "",
        domain: key ? formatAST(ast.value[key]) : "[]",
    };
}

export function isGeoValue(value) {
    return parseGeoValue(value) !== null;
}

/**
 * Build the right operand of an indirect geo condition.
 * @param {Object} params
 * @returns {Expression}
 */
export function makeGeoValue({resModel, fieldName, domain = "[]"} = {}) {
    const value = {};
    if (resModel && fieldName) {
        value[`${resModel}.${fieldName}`] = new Domain(domain).ast;
    }
    // 11: python dictionary
    return new Expression({type: 11, value});
}

/**
 * Return the ids of a sub-domain selecting records by id
 * ([("id", "in", [...])], or [] for all the records), null for any other
 * sub-domain.
 * @param {String} domain
 * @returns {Number[]|null}
 */
export function getRecordIds(domain) {
    let conditions = null;
    try {
        conditions = new Domain(domain).toList({});
    } catch {
        return null;
    }
    if (!conditions.length) {
        return [];
    }
    const [condition] = conditions;
    if (
        conditions.length === 1 &&
        Array.isArray(condition) &&
        condition[0] === "id" &&
        condition[1] === "in" &&
        Array.isArray(condition[2]) &&
        condition[2].every((id) => Number.isInteger(id))
    ) {
        return condition[2];
    }
    return null;
}

function makeRecordsDomain(ids) {
    return ids.length ? `[("id", "in", [${ids.join(", ")}])]` : "[]";
}

/**
 * Value editor of the domain selector for the geo operators: either records
 * of a model (through one of its geo fields), picked like the records of a
 * many2one or filtered by a sub-domain, or a WKT/GeoJSON geometry. The
 * reference (mode, model and geo field) is folded into a summary once set.
 */
export class DomainSelectorGeoFieldInput extends Component {
    static template = "base_geoengine.DomainSelectorGeoFieldInput";
    static components = {MultiRecordSelector, Select};
    props = useProps({
        value: t.any(),
        update: t.function(),
        resModel: t.string(),
    });

    setup() {
        this.orm = useService("orm");
        this.treeProcessor = useService("tree_processor");
        this.addDialog = useOwnedDialogs();
        this.debugMode = usePlugin(DebugModePlugin);
        const geoValue = this.getGeoValue();
        this.state = proxy({
            referenceModels: [],
            domainDescription: "",
            isReferenceFolded:
                geoValue.mode === "geometry" || Boolean(geoValue.resModel),
        });
        this.modeOptions = [
            ["records", _t("records of")],
            ["geometry", _t("geometry")],
        ];

        onWillStart(async () => {
            this.state.referenceModels = await loadGeoReferenceModels(
                this.orm,
                this.props.resModel
            );
            await this.loadDomainDescription(this.props);
        });
        onWillUpdateProps((nextProps) => this.loadDomainDescription(nextProps));
    }

    getGeoValue() {
        return parseGeoValue(this.props.value) || {mode: "records"};
    }

    getReferenceModel(resModel) {
        return this.state.referenceModels.find((model) => model.model === resModel);
    }

    getModelOptions() {
        return this.state.referenceModels.map((info) => [info.model, info.name]);
    }

    getModelPlaceholder() {
        return _t("Select a model");
    }

    getFieldOptions(geoValue) {
        return this.getReferenceModel(geoValue.resModel)?.fields || [];
    }

    /**
     * Summary of the folded reference, e.g. "Contact > geom Grenzen".
     * @param {Object} geoValue
     * @returns {String}
     */
    getReferenceSummary(geoValue) {
        if (geoValue.mode === "geometry") {
            return _t("Geometry");
        }
        const info = this.getReferenceModel(geoValue.resModel);
        if (!info) {
            return this.getModelPlaceholder();
        }
        const field = info.fields.find(([name]) => name === geoValue.fieldName);
        return field ? `${info.name} \u203a ${field[1]}` : info.name;
    }

    getRecordIds(geoValue) {
        return getRecordIds(geoValue.domain);
    }

    getRecordsPlaceholder(geoValue) {
        return _t("All %(model)s records", {
            model: this.getReferenceModel(geoValue.resModel)?.name || geoValue.resModel,
        });
    }

    async loadDomainDescription(props) {
        const {mode, resModel, domain} = parseGeoValue(props.value) || {};
        let description = "";
        if (mode === "records" && resModel && getRecordIds(domain) === null) {
            try {
                const tree = await this.treeProcessor.treeFromDomain(
                    resModel,
                    new Domain(domain)
                );
                description = await this.treeProcessor.getDomainTreeDescription(
                    resModel,
                    tree
                );
            } catch {
                description = domain;
            }
        }
        this.state.domainDescription = description;
    }

    toggleReference() {
        this.state.isReferenceFolded = !this.state.isReferenceFolded;
    }

    onModeChange(mode) {
        this.props.update(mode === "geometry" ? "" : makeGeoValue());
    }

    onModelChange(resModel) {
        const info = this.getReferenceModel(resModel);
        this.props.update(makeGeoValue({resModel, fieldName: info?.fields[0]?.[0]}));
    }

    onFieldChange(fieldName) {
        this.props.update(makeGeoValue({...this.getGeoValue(), fieldName}));
    }

    onRecordsChange(ids) {
        const domain = makeRecordsDomain([...new Set(ids)]);
        this.props.update(makeGeoValue({...this.getGeoValue(), domain}));
    }

    onGeometryChange(ev) {
        this.props.update(ev.target.value.trim());
    }

    openDomainDialog() {
        const geoValue = this.getGeoValue();
        this.addDialog(DomainSelectorGeoFieldDialog, {
            resModel: geoValue.resModel,
            domain: geoValue.domain,
            readonly: false,
            isDebugMode: this.debugMode.isActive(),
            onConfirm: (domain) =>
                this.props.update(makeGeoValue({...geoValue, domain})),
            title: _t("Subdomain"),
        });
    }
}
