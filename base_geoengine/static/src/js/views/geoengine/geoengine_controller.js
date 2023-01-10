/* ---------------------------------------------------------
 * Odoo base_geoengine
 * Contributor Yannick Vaucher 2018 Camptocamp SA
 * License in __manifest__.py at root level of the module
 * ---------------------------------------------------------
 */
odoo.define("base_geoengine.GeoengineController", function (require) {
    "use strict";

    /**
     * The Geoengine Controller controls the geo renderer and the geo model.
     * Its role is to allow these two components to communicate properly, and
     * also, to render and bind all extra actions in the 'Sidebar'.
     */

    var core = require("web.core");
    var BasicController = require("web.BasicController");
    var pyUtils = require("web.py_utils");
    var Sidebar = require("web.Sidebar");
    var DataExport = require("web.DataExport");

    var _t = core._t;

    var GeoengineController = BasicController.extend({
        custom_events: _.extend({}, BasicController.prototype.custom_events, {
            selection_changed: "_onSelectionChanged",
        }),

        /**
         * @class
         * @override
         * @param {Object} parent node
         * @param {Boolean} params.editable
         * @param {Boolean} params.hasSidebar
         * @param {Object} params.toolbarActions
         * @param {Boolean} params.noLeaf
         */
        init: function (parent, model, renderer, params) {
            this._super.apply(this, arguments);
            this.hasSidebar = params.hasSidebar;
            this.toolbarActions = params.toolbarActions || {};
            this.noLeaf = params.noLeaf;
            this.selectedRecords = params.selectedRecords || [];
        },

        // --------------------------------------------------------------------
        // Public
        // --------------------------------------------------------------------

        /**
         * Calculate the active domain of the geo view. This should be done
         * only if the header checkbox has been checked. This is done by
         * evaluating the search results, and then adding the dataset domain
         * (ie. action domain).
         *
         * @todo This is done only for the data export. The full mechanism is
         * wrong, this method should be private, most of the code in the
         * sidebar should be moved to the controller, and we should not use the
         * getParent method...
         *
         * @returns {Deferred<Array[]>} a deferred that resolve to the active
         *                              domain
         */
        getActiveDomain: function () {
            // TODO: this method should be synchronous...
            var self = this;
            if (this.$("thead .o_list_record_selector input").prop("checked")) {
                var searchView = this.getParent().searchview;
                var searchData = searchView.build_search_data();
                var userContext = this.getSession().user_context;
                var results = pyUtils.eval_domains_and_contexts({
                    domains: searchData.domains,
                    contexts: [userContext].concat(searchData.contexts),
                    group_by_seq: searchData.groupbys || [],
                });
                var record = self.model.get(self.handle, {raw: true});
                return $.when(record.getDomain().concat(results.domain || []));
            }
            return $.Deferred().resolve();
        },

        /**
         * Returns the list of currently selected res_ids (with the check boxes
         * on the left)
         *
         * @override
         *
         * @returns {Number[]} list of res_ids
         */
        getSelectedIds: function () {
            return _.map(this.getSelectedRecords(), function (record) {
                return record.res_id;
            });
        },

        /**
         * Returns the list of currently selected records (highlighted on the
         * map)
         *
         * @returns {Object[]} list of records
         */
        getSelectedRecords: function () {
            var self = this;
            return _.map(this.selectedRecords, function (db_id) {
                return self.model.get(db_id, {raw: true});
            });
        },

        /**
         * Render the sidebar (the 'action' menu in the control panel, right of
         * the main buttons)
         *
         * @param {jQuery.Element} $node
         */
        renderSidebar: function ($node) {
            if (this.hasSidebar && !this.sidebar) {
                var other = [
                    {
                        label: _t("Export"),
                        callback: this._onExportData.bind(this),
                    },
                ];
                if (this.archiveEnabled) {
                    other.push({
                        label: _t("Archive"),
                        callback: this._onToggleArchiveState.bind(this, true),
                    });
                    other.push({
                        label: _t("Unarchive"),
                        callback: this._onToggleArchiveState.bind(this, false),
                    });
                }
                if (this.is_action_enabled("delete")) {
                    other.push({
                        label: _t("Delete"),
                        callback: this._onDeleteSelectedRecords.bind(this),
                    });
                }
                this.sidebar = new Sidebar(this, {
                    editable: this.is_action_enabled("edit"),
                    env: {
                        context: this.model
                            .get(this.handle, {
                                raw: true,
                            })
                            .getContext(),
                        activeIds: this.getSelectedIds(),
                        model: this.modelName,
                    },
                    actions: _.extend(this.toolbarActions, {other: other}),
                });
                this.sidebar.appendTo($node);

                this._toggleSidebar();
            }
        },

        /**
         * Overrides to update the list of selected records
         *
         * @override
         */
        update: function (params, options) {
            var self = this;
            if (options && options.keepSelection) {
                // Filter out removed records from selection
                var res_ids = this.model.get(this.handle).res_ids;
                this.selectedRecords = _.filter(this.selectedRecords, function (id) {
                    return _.contains(res_ids, self.model.get(id).res_id);
                });
            } else {
                this.selectedRecords = [];
            }
            params.selectedRecords = this.selectedRecords;
            return this._super.apply(this, arguments);
        },

        // --------------------------------------------------------------------
        // Private
        // --------------------------------------------------------------------

        /**
         * @see BasicController._abandonRecord
         * If the given abandoned record is not the main one, notifies the
         * renderer to remove the appropriate subrecord (line).
         *
         * @override
         * @private
         * @param {String} [recordID] - default to the main recordID
         */
        _abandonRecord: function (recordID) {
            this._super.apply(this, arguments);
            if ((recordID || this.handle) !== this.handle) {
                var state = this.model.get(this.handle);
                this.renderer.removeLine(state, recordID);
                this._updatePager();
            }
        },

        /**
         * Adds a record to the list.
         * Disables the buttons to prevent concurrent record creation or
         * edition.
         * TODO probably not needed
         *
         * @todo make record creation a basic controller feature
         * @private
         *
         * @returns {Deferred} callback
         */
        _addRecord: function () {
            var self = this;
            this._disableButtons();
            return this.renderer
                .unselectRow()
                .then(function () {
                    return self.model.addDefaultRecord(self.handle, {
                        position: self.editable,
                    });
                })
                .then(function (recordID) {
                    var state = self.model.get(self.handle);
                    self.renderer.updateState(state, {});
                    self.renderer.editRecord(recordID);
                    self._updatePager();
                })
                .always(this._enableButtons.bind(this));
        },

        /**
         * Archive the current selection
         *
         * @private
         * @param {String[]} ids - ids of objects to (un)archive
         * @param {Boolean} archive - to active or deactive
         * @returns {Deferred} callback
         */
        _archive: function (ids, archive) {
            if (ids.length === 0) {
                return $.when();
            }
            return this.model
                .toggleActive(ids, !archive, this.handle)
                .then(this.update.bind(this, {}, {reload: false}));
        },

        /**
         * @override
         * @private
         */
        _getSidebarEnv: function () {
            var env = this._super.apply(this, arguments);
            var record = this.model.get(this.handle);
            return _.extend(env, {domain: record.getDomain()});
        },

        /**
         * Display the sidebar (the 'action' menu in the control panel)
         * if we have some selected records.
         */
        _toggleSidebar: function () {
            if (this.sidebar) {
                this.sidebar.do_toggle(this.selectedRecords.length > 0);
            }
        },

        /**
         * @override
         * @returns {Deferred}
         */
        _update: function () {
            this._toggleSidebar();
            return this._super.apply(this, arguments);
        },

        // --------------------------------------------------------------------
        // Handlers
        // --------------------------------------------------------------------

        /**
         * When the current selection changes (by clicking on the checkboxes on
         * the left), we need to display (or hide) the 'sidebar'.
         *
         * @private
         * @param {OdooEvent} event
         */
        _onSelectionChanged: function (event) {
            this.selectedRecords = event.data.selection;
            this._toggleSidebar();
        },

        /**
         * Called when clicking on 'Archive' or 'Unarchive' in the sidebar.
         *
         * @private
         * @param {Boolean} archive
         */
        _onToggleArchiveState: function (archive) {
            this._archive(this.selectedRecords, archive);
        },

        /**
         * Opens the Export Dialog
         *
         * @private
         */
        _onExportData: function () {
            var record = this.model.get(this.handle);
            new DataExport(this, record).open();
        },

        /**
         * Called when the 'delete' action is clicked on in the side bar.
         *
         * @private
         */
        _onDeleteSelectedRecords: function () {
            this._deleteRecords(this.selectedRecords);
        },
    });

    return GeoengineController;
});
