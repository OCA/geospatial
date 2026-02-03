/** @odoo-module **/
/*
 * Copyright (C) 2025 KMEE (https://kmee.com.br)
 * @author Luis Felipe Mileo <mileo@kmee.com.br>
 * License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).
 */

import {Component, useRef} from "@odoo/owl";
import {useService} from "@web/core/utils/hooks";
import {useModelWithSampleData} from "@web/model/model";
import {standardViewProps} from "@web/views/standard_view_props";
import {useSetupAction} from "@web/search/action_hook";
import {Layout} from "@web/search/layout";
import {SearchBar} from "@web/search/search_bar/search_bar";
import {useSearchBarToggler} from "@web/search/search_bar/search_bar_toggler";
import {CogMenu} from "@web/search/cog_menu/cog_menu";
import {executeButtonCallback} from "@web/views/view_button/view_button_hook";

/**
 * LeafletMapController is the main controller for the leaflet map view.
 * It manages the model lifecycle and coordinates between the search panel
 * and the renderer. Follows the standard Odoo view controller pattern.
 */
export class LeafletMapController extends Component {
    static template = "web_view_leaflet_map.LeafletMapController";
    static components = {Layout, SearchBar, CogMenu};

    static props = {
        ...standardViewProps,
        Model: Function,
        modelParams: Object,
        Renderer: Function,
        buttonTemplate: {type: String, optional: true},
    };

    setup() {
        this.action = useService("action");
        this.notification = useService("notification");

        // Root ref for button callbacks and action state management
        this.rootRef = useRef("root");

        // Use the standard model hook that integrates with WithSearch
        this.model = useModelWithSampleData(this.props.Model, this.props.modelParams);

        // Setup action hook for state management
        useSetupAction({
            rootRef: this.rootRef,
            getLocalState: () => ({metaData: this.model.metaData}),
        });

        // Setup search bar toggler for mobile responsiveness
        this.searchBarToggler = useSearchBarToggler();
    }

    /**
     * Handle click on Create button.
     * Uses executeButtonCallback for proper button state management.
     */
    async onClickCreate() {
        return executeButtonCallback(this.rootRef.el, () => this.createRecord());
    }

    /**
     * Create a new record using the view's createRecord prop.
     */
    async createRecord() {
        await this.props.createRecord();
    }

    /**
     * Handle resequence event from the renderer.
     *
     * @param {Number} recordId - ID of the record being moved
     * @param {Number} targetGroupId - ID of the target group
     * @param {Number|null} previousRecordId - ID of the preceding record
     */
    async onResequence(recordId, targetGroupId, previousRecordId) {
        try {
            const result = await this.model.resequence(
                recordId,
                targetGroupId,
                previousRecordId
            );

            if (!result.success) {
                this.notification.add(result.error || "Failed to reorder item", {
                    type: "danger",
                });
            }
            return result;
        } catch (error) {
            this.notification.add(error.message || "Failed to reorder item", {
                type: "danger",
            });
            return {success: false, error: error.message};
        }
    }

    /**
     * Get props to pass to the Renderer component.
     */
    get rendererProps() {
        return {
            model: this.model,
            onResequence: this.onResequence.bind(this),
        };
    }
}
