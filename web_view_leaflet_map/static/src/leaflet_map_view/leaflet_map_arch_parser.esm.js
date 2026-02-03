/** @odoo-module **/
/*
 * Copyright (C) 2025 KMEE (https://kmee.com.br)
 * @author Luis Felipe Mileo <mileo@kmee.com.br>
 * License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).
 */

import {visitXML} from "@web/core/utils/xml";

/**
 * LeafletMapArchParser parses the XML architecture of leaflet_map views.
 * Extracts field definitions and view options from the arch XML.
 */
export class LeafletMapArchParser {
    /**
     * Parse the arch XML and extract view configuration.
     * Follows the standard Odoo pattern with (arch, fields) signature.
     *
     * @param {Element} arch - The XML arch element
     * @param {Object} fields - Field definitions from the model (optional)
     * @returns {Object} Parsed arch information
     */
    parse(arch, fields = {}) {
        const archInfo = {
            // Required fields that are always loaded
            fieldNames: ["id", "display_name"],
            // Fields displayed in marker popup
            fieldNamesMarkerPopup: [],
            // Field metadata from arch
            fieldNodes: {},
            // Store fields reference for validation
            fields,
        };

        visitXML(arch, (node) => {
            if (node.tagName === "leaflet_map") {
                this._parseMapAttributes(node, archInfo);
            }

            if (node.tagName === "field") {
                this._parseFieldNode(node, archInfo, fields);
            }
        });

        return archInfo;
    }

    /**
     * Parse attributes from the leaflet_map element.
     *
     * @param {Element} node - The leaflet_map XML element
     * @param {Object} archInfo - The arch info object to populate
     */
    _parseMapAttributes(node, archInfo) {
        const getAttr = (name, defaultVal = null) =>
            node.getAttribute(name) || defaultVal;

        // Coordinate fields (required)
        archInfo.fieldLatitude = getAttr("field_latitude");
        archInfo.fieldLongitude = getAttr("field_longitude");
        if (archInfo.fieldLatitude) {
            archInfo.fieldNames.push(archInfo.fieldLatitude);
        }
        if (archInfo.fieldLongitude) {
            archInfo.fieldNames.push(archInfo.fieldLongitude);
        }

        // Display fields
        archInfo.fieldTitle = getAttr("field_title");
        archInfo.fieldAddress = getAttr("field_address");
        archInfo.fieldMarkerIconImage = getAttr("field_marker_icon_image");
        if (archInfo.fieldTitle) {
            archInfo.fieldNames.push(archInfo.fieldTitle);
        }
        if (archInfo.fieldAddress) {
            archInfo.fieldNames.push(archInfo.fieldAddress);
        }
        if (archInfo.fieldMarkerIconImage) {
            archInfo.fieldNames.push(archInfo.fieldMarkerIconImage);
        }

        // Marker icon configuration
        archInfo.markerIconSizeX = parseInt(getAttr("marker_icon_size_x", "64"), 10);
        archInfo.markerIconSizeY = parseInt(getAttr("marker_icon_size_y", "64"), 10);
        archInfo.markerPopupAnchorX = parseInt(
            getAttr("marker_popup_anchor_x", "0"),
            10
        );
        archInfo.markerPopupAnchorY = parseInt(
            getAttr("marker_popup_anchor_y", "-32"),
            10
        );

        // Map configuration
        archInfo.defaultZoom = parseInt(getAttr("default_zoom", "7"), 10);
        archInfo.maxZoom = parseInt(getAttr("max_zoom", "19"), 10);
        archInfo.zoomSnap = parseInt(getAttr("zoom_snap", "1"), 10);

        // View options
        archInfo.showPinList = getAttr("show_pin_list") !== "0";
        archInfo.panelTitle = getAttr("panel_title") || "Locations";
        archInfo.numberedMarkers = getAttr("numbered_markers") === "1";
        archInfo.routing = getAttr("routing") === "1";
        archInfo.enableNavigation = getAttr("enable_navigation") !== "0";

        // Grouping configuration
        archInfo.groupBy = getAttr("group_by");
        if (archInfo.groupBy) {
            archInfo.fieldNames.push(archInfo.groupBy);
        }

        // Drag-and-drop configuration
        archInfo.draggable = getAttr("draggable") === "1";
        archInfo.groupField = getAttr("group_field");
        archInfo.defaultOrder = getAttr("default_order");
        if (archInfo.groupField) {
            archInfo.fieldNames.push(archInfo.groupField);
        }
        if (archInfo.defaultOrder) {
            archInfo.fieldNames.push(archInfo.defaultOrder);
        }

        // Data limits
        archInfo.limit = parseInt(getAttr("limit", "500"), 10);

        // Custom js_class for extended views
        archInfo.jsClass = getAttr("js_class");

        // Configurable unassigned group name (default: "Unassigned")
        archInfo.unassignedGroupName = getAttr("unassigned_group_name");
    }

    /**
     * Parse a field node from the arch.
     *
     * @param {Element} node - The field XML element
     * @param {Object} archInfo - The arch info object to populate
     * @param {Object} fields - Field definitions from the model
     */
    _parseFieldNode(node, archInfo, fields) {
        const fieldName = node.getAttribute("name");
        if (!fieldName) {
            return;
        }

        archInfo.fieldNames.push(fieldName);

        // Get field info from model definition if available
        const fieldDef = fields[fieldName] || {};

        archInfo.fieldNodes[fieldName] = {
            name: fieldName,
            string: node.getAttribute("string") || fieldDef.string || fieldName,
            invisible: node.getAttribute("invisible") === "1",
            type: fieldDef.type,
        };

        archInfo.fieldNamesMarkerPopup.push({
            fieldName,
            string: node.getAttribute("string") || fieldDef.string || fieldName,
        });
    }
}
