odoo.define("web_view_google_map.GoogleMapController", function (require) {
    "use strict";

    const Context = require("web.Context");
    const core = require("web.core");
    const BasicController = require("web.BasicController");
    const Domain = require("web.Domain");
    var Dialog = require("web.Dialog");

    const qweb = core.qweb;

    const GoogleMapController = BasicController.extend({
        custom_events: _.extend({}, BasicController.prototype.custom_events, {
            button_clicked: "_onButtonClicked",
            kanban_record_delete: "_onRecordDelete",
            kanban_record_update: "_onUpdateRecord",
            kanban_column_archive_records: "_onArchiveRecords",
        }),
        /**
         * @override
         * @param {Object} params
         */
        init: function (parent, model, renderer, params) {
            this._super.apply(this, arguments);
            this.actionButtons = params.actionButtons;
            this.defaultButtons = params.defaultButtons;
            this.on_create = params.on_create;
            this.hasButtons = params.hasButtons;
            this.is_marker_edit = false;
        },
        start: function () {
            return this._super
                .apply(this, arguments)
                .then(this._checkEditMarker.bind(this));
        },
        _checkEditMarker: function () {
            if (this._isEditMarkerInContext()) {
                this._onEditMarker();
            }
        },
        _isEditMarkerInContext: function () {
            const record = this.model.get(this.handle);
            const context = record.getContext();
            return context.edit_geo_field;
        },
        /**
         * @private
         * @param {Widget} kanbanRecord
         * @param {Object} params
         */
        _reloadAfterButtonClick: function (kanbanRecord, params) {
            const recordModel = this.model.localData[params.record.id];
            const group = this.model.localData[recordModel.parentID];
            const parent = this.model.localData[group.parentID];

            this.model.reload(params.record.id).then((db_id) => {
                const data = this.model.get(db_id);
                kanbanRecord.update(data);

                // Check if we still need to display the record. Some fields of the domain are
                // not guaranteed to be in data. This is for example the case if the action
                // contains a domain on a field which is not in the Kanban view. Therefore,
                // we need to handle multiple cases based on 3 variables:
                // domInData: all domain fields are in the data
                // activeInDomain: 'active' is already in the domain
                // activeInData: 'active' is available in the data

                const domain = (parent ? parent.domain : group.domain) || [];
                const domInData = _.every(domain, function (d) {
                    return d[0] in data.data;
                });
                const activeInDomain = _.pluck(domain, 0).indexOf("active") !== -1;
                const activeInData = "active" in data.data;

                // Case # | domInData | activeInDomain | activeInData
                //   1    |   true    |      true      |      true     => no domain change
                //   2    |   true    |      true      |      false    => not possible
                //   3    |   true    |      false     |      true     => add active in domain
                //   4    |   true    |      false     |      false    => no domain change
                //   5    |   false   |      true      |      true     => no evaluation
                //   6    |   false   |      true      |      false    => no evaluation
                //   7    |   false   |      false     |      true     => replace domain
                //   8    |   false   |      false     |      false    => no evaluation

                // There are 3 cases which cannot be evaluated since we don't have all the
                // necessary information. The complete solution would be to perform a RPC in
                // these cases, but this is out of scope. A simpler one is to do a try / catch.

                if (domInData && !activeInDomain && activeInData) {
                    domain = domain.concat([["active", "=", true]]); // eslint-disable-line
                } else if (!domInData && !activeInDomain && activeInData) {
                    domain = [["active", "=", true]]; // eslint-disable-line
                }
                let visible = null;
                try {
                    visible = new Domain(domain).compute(data.evalContext);
                } catch (e) {
                    return;
                }
                if (!visible) {
                    kanbanRecord.destroy();
                }
            });
        },
        /**
         * @private
         * @param {OdooEvent} ev
         */
        _onButtonClicked: function (ev) {
            ev.stopPropagation();
            const attrs = ev.data.attrs;
            const record = ev.data.record;
            const def = Promise.resolve();
            if (attrs.context) {
                attrs.context = new Context(attrs.context).set_eval_context({
                    active_id: record.res_id,
                    active_ids: [record.res_id],
                    active_model: record.model,
                });
            }
            if (attrs.confirm) {
                /* eslint-disable */
                def = new Promise((resolve, reject) => {
                    Dialog.confirm(this, attrs.confirm, {
                        confirm_callback: resolve,
                        cancel_callback: reject,
                    }).on("closed", null, reject);
                });
                /* eslint-enable */
            }
            def.then(() => {
                this.trigger_up("execute_action", {
                    action_data: attrs,
                    env: {
                        context: record.getContext(),
                        currentID: record.res_id,
                        model: record.model,
                        resIDs: record.res_ids,
                    },
                    on_closed: this._reloadAfterButtonClick.bind(
                        this,
                        ev.target,
                        ev.data
                    ),
                });
            });
        },

        /**
         * The interface allows in some case the user to archive a column. This is
         * what this handler is for.
         *
         * @private
         * @param {OdooEvent} ev
         */
        _onArchiveRecords: async function (ev) {
            const archive = ev.data.archive;
            const column = ev.target;
            const recordIds = _.pluck(column.records, "id");
            if (recordIds.length) {
                const prom = archive
                    ? this.model.actionArchive(recordIds, column.db_id)
                    : this.model.actionUnarchive(recordIds, column.db_id);
                prom.then((dbID) => {
                    const data = this.model.get(dbID);
                    if (data) {
                        // Could be null if a wizard is returned for example
                        this.model.reload(this.handle).then(() => {
                            const state = this.model.get(this.handle);
                            this.renderer.updateColumn(dbID, data, {state});
                        });
                    }
                });
            }
        },
        /**
         * @private
         * @param {OdooEvent} event
         */
        _onRecordDelete: function (event) {
            this._deleteRecords([event.data.id]);
        },
        _onUpdateRecord: function (ev) {
            const changes = _.clone(ev.data);
            ev.data.force_save = true;
            this._applyChanges(ev.target.db_id, changes, ev);
        },
        renderButtons: function ($node) {
            if (this.hasButtons) {
                this.$buttons = $(
                    qweb.render("GoogleMapView.buttons", {
                        widget: this,
                    })
                );
                this.$buttons.on(
                    "click",
                    "button.o-map-button-new",
                    this._onButtonNew.bind(this)
                );
                this.$buttons.on(
                    "click",
                    "button.o-map-button-center-map",
                    this._onButtonMapCenter.bind(this)
                );
                this.$buttons.on(
                    "click",
                    "button.o-map-button-marker-save",
                    this._onButtonSaveMarker.bind(this)
                );
                this.$buttons.on(
                    "click",
                    "button.o-map-button-marker-discard",
                    this._onButtonDiscardMarker.bind(this)
                );
                this.$buttons.appendTo($node);
            }
        },
        _isMarkerEditable: function () {
            const is_editable =
                this.initialState.count === 1 &&
                this.renderer.mapLibrary === "geometry";
            return is_editable;
        },
        _onButtonMapCenter: function (event) {
            event.stopPropagation();
            const func_name = "_map_center_" + this.renderer.mapMode;
            this.renderer[func_name].call(this.renderer, true);
        },
        _onButtonNew: function (event) {
            event.stopPropagation();
            this.trigger_up("switch_view", {
                view_type: "form",
                res_id: undefined,
            });
        },
        _onEditMarker: function () {
            this.is_marker_edit = true;
            this._updateMarkerButtons();
            this.renderer.setMarkerDraggable();
        },
        _onButtonSaveMarker: function (event) {
            event.stopPropagation();
            const record = this.model.get(this.handle);
            const marker_position = this.renderer.markers[0].getPosition();
            this.is_marker_edit = false;

            this._updateMarkerButtons();

            return this._rpc({
                model: this.modelName,
                method: "write",
                args: [
                    record.res_ids,
                    {
                        [this.renderer.fieldLat]: marker_position.lat(),
                        [this.renderer.fieldLng]: marker_position.lng(),
                    },
                ],
            }).then(() => {
                this.renderer.disableMarkerDraggable();
                this.reload();
                setTimeout(() => {
                    this.trigger_up("history_back");
                }, 2000);
            });
        },
        _onButtonDiscardMarker: function (event) {
            event.stopPropagation();
            this.is_marker_edit = false;
            this._updateMarkerButtons();
            this.renderer.disableMarkerDraggable();
            this._discardChanges();

            if (this._isEditMarkerInContext()) {
                this.trigger_up("history_back");
            } else {
                this.reload();
            }
        },
        _updateMarkerButtons: function () {
            this.$buttons
                .find(".o_form_marker_buttons_actions")
                .toggleClass("o_hidden", this.is_marker_edit);
            this.$buttons
                .find(".o_form_marker_buttons_edit")
                .toggleClass("o_hidden", !this.is_marker_edit);
        },
    });

    return GoogleMapController;
});
