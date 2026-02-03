/** @odoo-module **/
/*
 * Copyright (C) 2025 KMEE (https://kmee.com.br)
 * @author Luis Felipe Mileo <mileo@kmee.com.br>
 * License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).
 */

import {Component, useState} from "@odoo/owl";

/**
 * PinList component displays a sidebar with a list of map markers.
 * Supports grouping, collapsing, and click-to-center functionality.
 */
export class PinList extends Component {
    static template = "web_view_leaflet_map.PinList";
    static props = {
        records: {type: Array},
        groupBy: {type: [String, {value: null}, {value: undefined}], optional: true},
        groupColors: {type: Object, optional: true},
        panelTitle: {type: String, optional: true},
        onPinClick: {type: Function},
        onNavigateClick: {type: Function, optional: true},
        fieldTitle: {type: String, optional: true},
        fieldAddress: {type: String, optional: true},
        fieldLatitude: {type: String},
        fieldLongitude: {type: String},
        unassignedGroupName: {type: String, optional: true},
        // Accept additional props from extending modules (groupField, onResequence, etc.)
        // without strict type validation - enables extensibility
        "*": true,
    };
    static defaultProps = {
        panelTitle: "Locations",
        groupColors: {},
        unassignedGroupName: "Unassigned",
    };

    setup() {
        this.state = useState({
            collapsed: false,
            collapsedGroups: {},
        });
    }

    /**
     * Get records organized by groups.
     * Records without a groupBy value are placed in the unassigned group.
     */
    get groupedRecords() {
        const records = this.props.records;
        const UNASSIGNED_GROUP_NAME = this.props.unassignedGroupName;
        // Orange color for unassigned group
        const UNASSIGNED_COLOR = "#fd7e14";

        if (!this.props.groupBy) {
            return [{name: null, records, color: null, isUnassigned: false}];
        }

        const groups = {};
        for (const record of records) {
            const groupValue = record[this.props.groupBy];
            let isUnassigned = false;
            let groupKey = UNASSIGNED_GROUP_NAME;

            // Handle Many2one fields (array with [id, name]) and empty values
            if (!groupValue || (Array.isArray(groupValue) && !groupValue[0])) {
                // No group value - unassigned
                isUnassigned = true;
            } else {
                groupKey = Array.isArray(groupValue) ? groupValue[1] : groupValue;
            }

            if (!groups[groupKey]) {
                groups[groupKey] = {
                    name: groupKey,
                    records: [],
                    color: isUnassigned
                        ? UNASSIGNED_COLOR
                        : this.getGroupColor(groupKey),
                    isUnassigned: isUnassigned,
                };
            }
            groups[groupKey].records.push(record);
        }

        // Sort: alphabetically, then unassigned group last
        return Object.values(groups).sort((a, b) => {
            if (a.isUnassigned && !b.isUnassigned) return 1;
            if (!a.isUnassigned && b.isUnassigned) return -1;
            return String(a.name).localeCompare(String(b.name));
        });
    }

    /**
     * Get total count of located records
     */
    get locatedCount() {
        return this.props.records.filter(
            (r) =>
                r[this.props.fieldLatitude] &&
                r[this.props.fieldLongitude] &&
                this.validateCoordinates(
                    r[this.props.fieldLatitude],
                    r[this.props.fieldLongitude]
                )
        ).length;
    }

    /**
     * Get count of records without valid coordinates
     */
    get unlocatedCount() {
        return this.props.records.length - this.locatedCount;
    }

    /**
     * Validate coordinates are within valid ranges
     */
    validateCoordinates(lat, lng) {
        return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
    }

    /**
     * Get display title for a record
     */
    getRecordTitle(record) {
        if (this.props.fieldTitle) {
            return record[this.props.fieldTitle] || record.display_name || "";
        }
        return record.display_name || "";
    }

    /**
     * Get address for a record
     */
    getRecordAddress(record) {
        if (this.props.fieldAddress) {
            return record[this.props.fieldAddress] || "";
        }
        return "";
    }

    /**
     * Check if a record has valid coordinates
     */
    hasValidCoordinates(record) {
        const lat = record[this.props.fieldLatitude];
        const lng = record[this.props.fieldLongitude];
        return lat && lng && this.validateCoordinates(lat, lng);
    }

    /**
     * Get a color for a group (generates consistent colors based on group name)
     */
    getGroupColor(groupName) {
        if (this.props.groupColors[groupName]) {
            return this.props.groupColors[groupName];
        }

        // Generate a color based on the hash of the group name
        const colors = [
            "#FF6B6B",
            "#4ECDC4",
            "#45B7D1",
            "#96CEB4",
            "#FFEAA7",
            "#DDA0DD",
            "#98D8C8",
            "#F7DC6F",
            "#BB8FCE",
            "#85C1E9",
        ];

        let hash = 0;
        for (let i = 0; i < String(groupName).length; i++) {
            hash = String(groupName).charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    }

    /**
     * Toggle sidebar collapse state
     */
    toggleSidebar() {
        this.state.collapsed = !this.state.collapsed;
    }

    /**
     * Toggle group collapse state
     */
    toggleGroup(groupName) {
        this.state.collapsedGroups[groupName] = !this.state.collapsedGroups[groupName];
    }

    /**
     * Check if a group is collapsed.
     * The unassigned group is collapsed by default.
     */
    isGroupCollapsed(groupName) {
        // If explicitly set, use that value; otherwise default to collapsed for unassigned
        if (groupName in this.state.collapsedGroups) {
            return this.state.collapsedGroups[groupName];
        }
        // Default: unassigned group is collapsed, others are expanded
        return groupName === this.props.unassignedGroupName;
    }

    /**
     * Handle click on a pin item
     */
    onPinItemClick(record) {
        if (this.hasValidCoordinates(record)) {
            this.props.onPinClick(record);
        }
    }

    /**
     * Handle click on navigate button
     */
    onNavigateButtonClick(ev, record) {
        ev.stopPropagation();
        if (this.props.onNavigateClick && this.hasValidCoordinates(record)) {
            this.props.onNavigateClick(record);
        }
    }

    /**
     * Generate Google Maps navigation URL
     */
    getGoogleMapsUrl(record) {
        const lat = record[this.props.fieldLatitude];
        const lng = record[this.props.fieldLongitude];
        return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    }
}
