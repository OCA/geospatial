/** @odoo-module **/
/*
 * Copyright (C) 2025 KMEE (https://kmee.com.br)
 * @author Luis Felipe Mileo <mileo@kmee.com.br>
 * License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).
 */

/* global console, document, window */

import {useRef} from "@odoo/owl";
import {useService} from "@web/core/utils/hooks";
import {useSortable} from "@web/core/utils/sortable_owl";

import {PinList} from "./pin_list.esm";

/**
 * DraggablePinList extends PinList with drag-and-drop reordering capabilities.
 *
 * This is a generic component that can be used by any model that supports
 * resequencing. It enables users to:
 * - Reorder items within the same group (drag up/down)
 * - Move items between groups (drag to different group)
 * - Navigate to all items in a group via Google Maps
 *
 * Configuration is done via props:
 * - groupField: The field name for the group (e.g., "order_id")
 * - onResequence: Callback function for resequencing
 */
export class DraggablePinList extends PinList {
    static template = "web_view_leaflet_map.DraggablePinList";
    // Inherits props from PinList which includes "*": true for extensibility
    // Additional props used: onResequence (Function), groupField (String)

    setup() {
        super.setup();
        this.notification = useService("notification");
        this.rootRef = useRef("root");

        // Track drag state
        this._draggedRecordId = null;
        this._sourceGroupId = null;

        // Initialize sortable only if onResequence is provided
        if (this.props.onResequence) {
            this._setupSortable();
        }
    }

    /**
     * Setup the sortable functionality for drag-and-drop.
     */
    _setupSortable() {
        useSortable({
            ref: this.rootRef,
            elements: ".o_pin_item_draggable",
            handle: ".o_drag_handle",
            groups: ".o_pin_group",
            connectGroups: true,
            cursor: "grabbing",

            onDragStart: ({element, group}) => {
                element.classList.add("o_dragging");
                this._draggedRecordId = parseInt(element.dataset.id, 10);
                this._sourceGroupId = group ? this._getGroupId(group) : null;
            },

            onGroupEnter: ({group}) => {
                if (group) {
                    group.classList.add("o_drop_target");
                }
            },

            onGroupLeave: ({group}) => {
                if (group) {
                    group.classList.remove("o_drop_target");
                }
            },

            onDrop: async ({element, parent, previous}) => {
                await this._handleDrop(element, parent, previous);
            },

            onDragEnd: ({element}) => {
                element.classList.remove("o_dragging");
                document
                    .querySelectorAll(".o_drop_target")
                    .forEach((el) => el.classList.remove("o_drop_target"));
            },
        });
    }

    /**
     * Handle drop event after drag-and-drop operation.
     *
     * @param {HTMLElement} element - The dragged element
     * @param {HTMLElement|null} parent - The new parent group element
     * @param {HTMLElement|null} previous - The preceding sibling element
     */
    async _handleDrop(element, parent, previous) {
        const recordId = parseInt(element.dataset.id, 10);
        let targetGroupId = parent ? this._getGroupId(parent) : this._sourceGroupId;

        // Fallback to source group if target group ID couldn't be determined
        if (targetGroupId === null && this._sourceGroupId !== null) {
            console.warn(
                "DraggablePinList: Could not determine target group, using source group"
            );
            targetGroupId = this._sourceGroupId;
        }

        // Find reference record (previous element after drop)
        let previousRecordId = null;
        if (previous && previous.dataset.id) {
            previousRecordId = parseInt(previous.dataset.id, 10);
        }

        try {
            if (this.props.onResequence) {
                await this.props.onResequence(
                    recordId,
                    targetGroupId,
                    previousRecordId
                );
            }
        } catch (error) {
            this.notification.add(error.message || "Failed to reorder item", {
                type: "danger",
            });
        }
    }

    /**
     * Extract group ID from a group element.
     *
     * @param {HTMLElement} groupElement - The group DOM element
     * @returns {Number|null} The group ID or null
     */
    _getGroupId(groupElement) {
        const groupId = groupElement?.dataset?.groupId;
        if (
            !groupId ||
            groupId === "" ||
            groupId === "null" ||
            groupId === "undefined"
        ) {
            return null;
        }
        const parsed = parseInt(groupId, 10);
        return isNaN(parsed) ? null : parsed;
    }

    /**
     * Get the group ID from a record based on the groupField prop.
     *
     * @param {Object} record - The record object
     * @returns {Number|null} The group ID or null
     */
    getRecordGroupId(record) {
        // Use groupField from props if available, otherwise fall back to groupBy
        const fieldName = this.props.groupField || this.props.groupBy;
        if (!fieldName) return null;

        const value = record[fieldName];
        if (!value) return null;

        // Handle Many2one fields (array with [id, name])
        return Array.isArray(value) ? value[0] : value;
    }

    /**
     * Generate Google Maps URL for all records in a group (route).
     * Uses the same format as the backend generate_google_maps_url method.
     *
     * @param {Object} group - The group object with records
     * @returns {String|null} The Google Maps URL or null
     */
    getGroupGoogleMapsUrl(group) {
        const records = group.records
            .filter((r) => this.hasValidCoordinates(r))
            .sort((a, b) => (a.sequence || 0) - (b.sequence || 0));

        if (records.length < 2) {
            return null;
        }

        const coords = records.map((r) => [
            r[this.props.fieldLatitude],
            r[this.props.fieldLongitude],
        ]);

        const origin = `${coords[0][0]},${coords[0][1]}`;
        const destination = `${coords[coords.length - 1][0]},${coords[coords.length - 1][1]}`;
        const waypoints = coords
            .slice(1, -1)
            .map((c) => `${c[0]},${c[1]}`)
            .join("|");

        let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
        if (waypoints) {
            url += `&waypoints=${waypoints}`;
        }
        return url;
    }

    /**
     * Handler for "Navigate All" button click on group header.
     * Opens Google Maps with full route for the group.
     *
     * @param {Event} ev - The click event
     * @param {Object} group - The group object
     */
    onGroupNavigateClick(ev, group) {
        ev.stopPropagation();
        const url = this.getGroupGoogleMapsUrl(group);
        if (url) {
            window.open(url, "_blank");
        }
    }
}
