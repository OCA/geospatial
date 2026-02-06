/** @odoo-module **/
/*
 * Copyright (C) 2025 KMEE (https://kmee.com.br)
 * @author Luis Felipe Mileo <mileo@kmee.com.br>
 * License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).
 */

import {Model} from "@web/model/model";
import {KeepLast} from "@web/core/utils/concurrency";

/**
 * LeafletMapModel handles data loading and manipulation for the leaflet map view.
 * Extends the core Model class to integrate with Odoo's search infrastructure.
 */
export class LeafletMapModel extends Model {
    /**
     * Setup the model with initial parameters.
     * Called by the Model base class during construction.
     *
     * @param {Object} params - Model parameters from view props
     */
    setup(params) {
        this.keepLast = new KeepLast();

        // Store metadata for state restoration
        this.metaData = {
            ...params,
        };

        // Data state
        this.data = {
            records: [],
            recordGroups: [],
            count: 0,
            numberOfLocatedRecords: 0,
            isGrouped: false,
            groupByKey: false,
        };
    }

    /**
     * Load records based on search parameters.
     * Called by WithSearch when domain/groupBy/context changes.
     *
     * @param {Object} searchParams - Search parameters from WithSearch
     * @param {Array} searchParams.domain - Domain filter
     * @param {Array} searchParams.groupBy - GroupBy fields
     * @param {Object} searchParams.context - Additional context
     * @returns {Promise<void>}
     */
    async load(searchParams) {
        const {domain = [], groupBy = [], context = {}} = searchParams;

        // Merge search params into metadata
        const metaData = {
            ...this.metaData,
            domain,
            groupBy: groupBy.length > 0 ? groupBy[0] : this.metaData.archInfo?.groupBy,
            context: {...this.metaData.context, ...context},
        };

        // Fetch data with the merged parameters
        this.data = await this.keepLast.add(this._fetchData(metaData));

        // Update metadata after successful load
        this.metaData = metaData;

        this.notify();
    }

    /**
     * Check if the model has data to display.
     *
     * @returns {Boolean}
     */
    hasData() {
        return this.data.records.length > 0;
    }

    /**
     * Fetch data from the server.
     *
     * @param {Object} metaData - Metadata with fetch parameters
     * @returns {Promise<Object>} The fetched data
     */
    async _fetchData(metaData) {
        const {
            resModel,
            domain = [],
            context = {},
            archInfo = {},
            limit,
            offset = 0,
        } = metaData;

        const fields = this._getFieldsToLoad(metaData);
        const recordLimit = limit || archInfo.limit || 500;

        const records = await this.orm.searchRead(resModel, domain, fields, {
            limit: recordLimit,
            offset,
            context,
        });

        // Determine groupBy - from search params or archInfo
        const groupByField = metaData.groupBy || archInfo.groupBy;

        // Calculate located records
        const locatedRecords = this._filterLocatedRecords(records, archInfo);

        // Group records if groupBy is configured
        let recordGroups = [];
        let isGrouped = false;
        let groupByKey = false;

        if (groupByField) {
            recordGroups = this._groupRecords(records, groupByField);
            isGrouped = true;
            groupByKey = groupByField;
        } else {
            recordGroups = [{name: null, id: null, records}];
        }

        return {
            records,
            recordGroups,
            count: records.length,
            numberOfLocatedRecords: locatedRecords.length,
            isGrouped,
            groupByKey,
        };
    }

    /**
     * Get the list of fields to load based on archInfo.
     *
     * @param {Object} metaData - Metadata containing archInfo
     * @returns {Array<String>} Field names to load
     */
    _getFieldsToLoad(metaData) {
        const archInfo = metaData.archInfo || {};
        const fields = new Set(archInfo.fieldNames || []);

        // Ensure essential fields are always loaded
        fields.add("id");
        fields.add("display_name");

        // Add sequence field if available (for ordering)
        if (metaData.fields?.sequence) {
            fields.add("sequence");
        }

        return Array.from(fields);
    }

    /**
     * Filter records that have valid coordinates.
     *
     * @param {Array} records - All records
     * @param {Object} archInfo - Arch info with coordinate field names
     * @returns {Array} Records with valid coordinates
     */
    _filterLocatedRecords(records, archInfo) {
        const {fieldLatitude, fieldLongitude} = archInfo;
        if (!fieldLatitude || !fieldLongitude) {
            return records;
        }

        return records.filter((r) => {
            const lat = r[fieldLatitude];
            const lng = r[fieldLongitude];
            return this._validateCoordinates(lat, lng);
        });
    }

    /**
     * Validate that coordinates are within valid ranges.
     *
     * @param {Number} lat - Latitude
     * @param {Number} lng - Longitude
     * @returns {Boolean}
     */
    _validateCoordinates(lat, lng) {
        try {
            const parsedLat = parseFloat(lat);
            const parsedLng = parseFloat(lng);
            return (
                !isNaN(parsedLat) &&
                !isNaN(parsedLng) &&
                parsedLat >= -90 &&
                parsedLat <= 90 &&
                parsedLng >= -180 &&
                parsedLng <= 180
            );
        } catch {
            return false;
        }
    }

    /**
     * Group records by the groupBy field.
     *
     * @param {Array} records - Records to group
     * @param {String} groupBy - Field name to group by
     * @returns {Array<Object>} Grouped records
     */
    _groupRecords(records, groupBy) {
        const groups = {};

        for (const record of records) {
            const groupValue = record[groupBy];
            // Handle Many2one fields (array with [id, name])
            const groupName = Array.isArray(groupValue)
                ? groupValue[1]
                : groupValue || "Undefined";
            const groupId = Array.isArray(groupValue) ? groupValue[0] : groupValue;

            if (!groups[groupName]) {
                groups[groupName] = {
                    name: groupName,
                    id: groupId,
                    records: [],
                };
            }
            groups[groupName].records.push(record);
        }

        // Sort groups alphabetically by name
        return Object.values(groups).sort((a, b) =>
            String(a.name).localeCompare(String(b.name))
        );
    }

    /**
     * Generic resequence method for drag-and-drop operations.
     * This base implementation updates the sequence field directly.
     * Override in subclasses for model-specific behavior.
     *
     * @param {Number} recordId - ID of the record being moved
     * @param {Number} targetGroupId - ID of the target group
     * @param {Number|null} previousRecordId - ID of the preceding record (null = first)
     * @returns {Promise<Object>} Result of the operation
     */
    async resequence(recordId, targetGroupId, previousRecordId) {
        const archInfo = this.metaData.archInfo || {};

        if (!archInfo.defaultOrder) {
            return {success: false, error: "Resequencing not configured"};
        }

        const record = this.data.records.find((r) => r.id === recordId);
        if (!record) {
            return {success: false, error: "Record not found"};
        }

        const updates = {};
        const sequenceField = archInfo.defaultOrder;

        // Calculate new sequence value
        if (previousRecordId) {
            const prevRecord = this.data.records.find((r) => r.id === previousRecordId);
            if (prevRecord && prevRecord[sequenceField] !== undefined) {
                updates[sequenceField] = prevRecord[sequenceField] + 1;
            } else {
                updates[sequenceField] = 10;
            }
        } else {
            // Insert at beginning - find minimum sequence in target group
            const targetRecords = this.data.records.filter((r) => {
                if (!archInfo.groupField) return true;
                const groupValue = r[archInfo.groupField];
                const groupId = Array.isArray(groupValue) ? groupValue[0] : groupValue;
                return groupId === targetGroupId;
            });

            if (targetRecords.length > 0) {
                const minSeq = Math.min(
                    ...targetRecords.map((r) => r[sequenceField] || 0)
                );
                updates[sequenceField] = minSeq - 10;
            } else {
                updates[sequenceField] = 10;
            }
        }

        // Update group field if moving between groups
        if (archInfo.groupField) {
            const currentGroupValue = record[archInfo.groupField];
            const currentGroupId = Array.isArray(currentGroupValue)
                ? currentGroupValue[0]
                : currentGroupValue;

            if (currentGroupId !== targetGroupId) {
                // Use false to clear Many2one field when moving to unassigned group
                updates[archInfo.groupField] =
                    targetGroupId === null ? false : targetGroupId;
            }
        }

        try {
            await this.orm.write(this.metaData.resModel, [recordId], updates);
            // Reload data to reflect server-side changes
            this.data = await this._fetchData(this.metaData);
            this.notify();
            return {success: true};
        } catch (error) {
            return {success: false, error: this._extractErrorMessage(error)};
        }
    }

    /**
     * Extract a user-friendly error message from an RPC error.
     * Odoo RPCError stores the actual message in error.data.message,
     * while error.message is the generic "Odoo Server Error".
     *
     * @param {Error} error - The caught error
     * @returns {String} User-friendly error message
     */
    _extractErrorMessage(error) {
        return error.data?.message || error.message || String(error);
    }

    /**
     * Get records with valid coordinates.
     *
     * @returns {Array} Records with valid lat/lng
     */
    getLocatedRecords() {
        const archInfo = this.metaData.archInfo || {};
        const {fieldLatitude, fieldLongitude} = archInfo;
        return this.data.records.filter((r) => {
            const lat = r[fieldLatitude];
            const lng = r[fieldLongitude];
            return this._validateCoordinates(lat, lng);
        });
    }

    /**
     * Get records without valid coordinates.
     *
     * @returns {Array} Records without valid lat/lng
     */
    getUnlocatedRecords() {
        const archInfo = this.metaData.archInfo || {};
        const {fieldLatitude, fieldLongitude} = archInfo;
        return this.data.records.filter((r) => {
            const lat = r[fieldLatitude];
            const lng = r[fieldLongitude];
            return !this._validateCoordinates(lat, lng);
        });
    }
}
