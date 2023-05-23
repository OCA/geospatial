/** @odoo-module */

/**
 * Copyright 2023 ACSONE SA/NV
 */

import {Layout} from "@web/search/layout";
import {useModel} from "@web/views/model";
import {usePager} from "@web/search/pager_hook";
import {useOwnedDialogs, useService} from "@web/core/utils/hooks";
import {FormViewDialog} from "@web/views/view_dialogs/form_view_dialog";
import {WarningDialog} from "@web/core/errors/error_dialogs";
import {Component, useState} from "@odoo/owl";

export class GeoengineController extends Component {
    /**
     * Setup the controller by using the useModel hook.
     */
    setup() {
        this.state = useState({isSavedOrDiscarded: false});
        this.actionService = useService("action");
        this.view = useService("view");
        this.addDialog = useOwnedDialogs();
        this.editable = this.props.archInfo.editable;
        this.model = useModel(this.props.Model, {
            activeFields: this.props.archInfo.activeFields,
            resModel: this.props.resModel,
            fields: this.props.fields,
            limit: this.props.limit,
        });

        /**
         * Allow you to display records on the map thanks to the paging located
         * at the top right of the screen.
         */
        usePager(() => {
            const list = this.model.root;
            const {count, limit, offset} = list;
            return {
                offset: offset,
                limit: limit,
                total: count,
                onUpdate: async ({offset, limit}) => {
                    await list.load({limit, offset});
                    this.render(true);
                },
            };
        });
    }
    /**
     * Allow you to open the form editing view for the filled-in model.
     * @param {*} resModel
     * @param {*} resId
     */
    async openRecord(resModel, resId) {
        const {views} = await this.view.loadViews({resModel, views: [[false, "form"]]});
        this.actionService.doAction({
            type: "ir.actions.act_window",
            res_model: resModel,
            views: [[views.form.id, "form"]],
            res_id: resId,
            target: "new",
            context: {edit: false, create: false},
        });
    }

    /**
     * When you finished drawing a new shape, this method is called to open form view and create the record.
     * @param {*} resModel
     * @param {*} field
     * @param {*} value
     */
    async createRecord(resModel, field, value) {
        const {views} = await this.view.loadViews({resModel, views: [[false, "form"]]});
        const context = {};
        context[`default_${field}`] = value;

        this.addDialog(FormViewDialog, {
            resModel: resModel,
            title: this.env._t("New record"),
            viewId: views.form.id,
            context,
            onRecordSaved: async () => await this.onSaveRecord(),
        });
    }

    /**
     * This method is called when you have finished to create a new record.
     */
    async onSaveRecord() {
        const offset = this.model.root.count + 1;
        await this.model.root.load({offset});
        this.render(true);
    }

    /**
     * This method is called when you click on save button after edit a spatial representation.
     */
    async onClickSave() {
        await this.model.root.editedRecord.save();
        this.state.isSavedOrDiscarded = true;
    }

    /**
     * This method is called when you click on discard button after edit a spatial representation.
     */
    async onClickDiscard() {
        await this.model.root.editedRecord.discard();
        this.state.isSavedOrDiscarded = true;
    }

    /**
     * When you have finished edtiting a spatial representation, this method is called to update the value.
     * @param {*} value
     */
    async updateRecord(value) {
        this.state.isSavedOrDiscarded = false;
        const newValue = {};
        const key = Object.keys(this.model.root.fields).find(
            (el) => this.model.root.fields[el].geo_type !== undefined
        );
        newValue[key] = value;
        await this.model.root.editedRecord.update(newValue);
    }

    /**
     * This method warns you if you start creating a record without having displayed the others.
     */
    onDrawStart() {
        const {count, records} = this.model.root;
        if (records.length < count) {
            this.addDialog(WarningDialog, {
                title: this.env._t("Warning"),
                message: this.env._t(
                    "You are about to create a new record without having displayed all the others. A risk of overlap could occur. Would you like to continue ?"
                ),
            });
        }
    }
}

GeoengineController.template = "base_geoengine.GeoengineController";
GeoengineController.components = {Layout};
