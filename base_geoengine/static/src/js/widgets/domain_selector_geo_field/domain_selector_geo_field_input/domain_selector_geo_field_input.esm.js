/** @odoo-module **/

/**
 * Copyright 2023 ACSONE SA/NV
 */

import {Component, onWillStart, onWillUpdateProps, useState} from "@odoo/owl";
import {Domain} from "@web/core/domain";
import {DomainSelectorGeoFieldDialog} from "../domain_selector_geo_field_dialog/domain_selector_geo_field_dialog.esm";
import {ModelFieldSelector} from "@web/core/model_field_selector/model_field_selector";
import {ModelSelector} from "@web/core/model_selector/model_selector";
import {evaluate} from "@web/core/py_js/py_interpreter";
import {useOwnedDialogs} from "@web/core/utils/hooks";

/**
 * This class correspond to the value of the right operand when a geo_field has
 * been selected.
 */
export class DomainSelectorGeoFieldInput extends Component {
    setup() {
        this.state = useState({
            resModel: "",
            fieldName: "",
            subField: "",
            operator: "",
            value: "",
            domain: {},
        });
        this.addDialog = useOwnedDialogs();

        /**
         * Before starting, if a value is already selected we had to know the fieldName and
         * the resModel.
         */
        onWillStart(async () => {
            if (this.props.value instanceof Object) {
                this.defaultKey = Object.keys(this.props.value)[0];
                const index = this.defaultKey.lastIndexOf(".");
                this.state.fieldName = this.defaultKey.substring(index + 1);
                this.state.resModel = this.defaultKey.substring(0, index);
                this.loadDomain();
            } else {
                this.state.value = this.props.value;
            }
        });

        onWillUpdateProps((nextProps) => this.loadDomain(nextProps));
    }

    /**
     * This method allow the domain to be loaded into a state.
     * @param {*} nextProps
     */
    loadDomain(nextProps) {
        const props = nextProps === undefined ? this.props : nextProps;
        if (this.defaultKey !== undefined) {
            this.key = this.defaultKey;
        }
        this.state.domain = new Domain(props.value[this.key]);
    }

    /**
     * This method updates the value of the right operand of the domain.
     * @param {*} value
     */
    update(value) {
        this.key = this.state.resModel + "." + this.state.fieldName;
        const obj = {};
        let jsDomain = [];
        if (value !== undefined) {
            const domain = new Domain(value);
            jsDomain = evaluate(domain.ast, {});
        }
        obj[this.key] = jsDomain;
        this.props.update({value: obj});
    }

    /**
     * This method reacts to changes of the sub field name.
     * @param {*} fieldName
     */
    async onFieldModelChange(fieldName) {
        this.state.fieldName = fieldName;
        this.update();
    }

    /**
     * When we click on the edit button, this launches a dialog window allowing you to
     * edit the sub-domain.
     */
    display() {
        const initialValue =
            this.state.domain === undefined ? "[]" : this.state.domain.toString();
        this.addDialog(DomainSelectorGeoFieldDialog, {
            resModel: this.state.resModel,
            initialValue,
            readonly: false,
            isDebugMode: Boolean(this.env.debug),
            fieldName: this.state.fieldName,
            onSelected: (value) => this.update(value),
            title: this.env._t("Subdomain"),
        });
    }

    /**
     * This method react to changes of the sub model.
     * @param {*} newModel
     */
    onModelChange(newModel) {
        this.state.resModel = newModel.technical;
        this.state.fieldName = "id";
        this.state.subField = "";
        this.update();
    }
}

DomainSelectorGeoFieldInput.template = "base_geoengine.DomainSelectorGeoFieldInput";
DomainSelectorGeoFieldInput.components = {ModelFieldSelector, ModelSelector};
