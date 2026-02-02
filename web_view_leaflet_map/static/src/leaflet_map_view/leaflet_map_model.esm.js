/** @odoo-module **/

import {KeepLast} from "@web/core/utils/concurrency";

/**
 * LeafletMapModel handles data loading and manipulation for the leaflet map view.
 */
export class LeafletMapModel {
    /**
     * @param {Object} env - The OWL environment
     * @param {Object} params - Model parameters
     * @param {Object} services - Available services (orm, etc.)
     */
    constructor(env, params, services) {
        this.env = env;
        this.orm = services.orm;
        this.keepLast = new KeepLast();

        // Model configuration from params
        this.resModel = params.resModel;
        this.archInfo = params.archInfo;
        this.fields = params.fields || {};
        this.context = params.context || {};

        // Data state
        this.data = {
            records: [],
            recordGroups: [],
            count: 0,
            loading: false,
        };

        // Current load parameters (for reload)
        this._loadParams = null;
    }

    /**
     * Load records from the server.
     *
     * @param {Object} params - Load parameters
     * @param {Array} params.domain - Domain filter
     * @param {Number} params.limit - Record limit
     * @param {Number} params.offset - Record offset
     * @param {Object} params.context - Additional context
     * @returns {Promise<Object>} The loaded data
     */
    async load(params) {
        this._loadParams = params;
        const {domain = [], limit, offset = 0, context = {}} = params;

        const fields = this._getFieldsToLoad();
        const recordLimit = limit || this.archInfo.limit || 500;

        this.data.loading = true;

        try {
            const records = await this.keepLast.add(
                this.orm.searchRead(this.resModel, domain, fields, {
                    limit: recordLimit,
                    offset,
                    context: {...this.context, ...context},
                })
            );

            this.data.records = records;
            this.data.count = records.length;

            // Group records if groupBy is configured
            if (this.archInfo.groupBy) {
                this.data.recordGroups = this._groupRecords(records);
            } else {
                this.data.recordGroups = [{name: null, id: null, records}];
            }

            return this.data;
        } finally {
            this.data.loading = false;
        }
    }

    /**
     * Reload data with current parameters.
     *
     * @returns {Promise<Object>} The reloaded data
     */
    async reload() {
        if (this._loadParams) {
            return this.load(this._loadParams);
        }
        return this.data;
    }

    /**
     * Get the list of fields to load based on archInfo.
     *
     * @returns {Array<String>} Field names to load
     */
    _getFieldsToLoad() {
        const fields = new Set(this.archInfo.fieldNames || []);

        // Ensure essential fields are always loaded
        fields.add("id");
        fields.add("display_name");

        // Add sequence field if available (for ordering)
        if (this.fields.sequence) {
            fields.add("sequence");
        }

        return Array.from(fields);
    }

    /**
     * Group records by the groupBy field.
     *
     * @param {Array} records - Records to group
     * @returns {Array<Object>} Grouped records
     */
    _groupRecords(records) {
        const groups = {};
        const groupBy = this.archInfo.groupBy;

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
        if (!this.archInfo.defaultOrder) {
            return {success: false, error: "Resequencing not configured"};
        }

        const record = this.data.records.find((r) => r.id === recordId);
        if (!record) {
            return {success: false, error: "Record not found"};
        }

        const updates = {};
        const sequenceField = this.archInfo.defaultOrder;

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
                if (!this.archInfo.groupField) return true;
                const groupValue = r[this.archInfo.groupField];
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
        if (this.archInfo.groupField && targetGroupId !== null) {
            const currentGroupValue = record[this.archInfo.groupField];
            const currentGroupId = Array.isArray(currentGroupValue)
                ? currentGroupValue[0]
                : currentGroupValue;

            if (currentGroupId !== targetGroupId) {
                updates[this.archInfo.groupField] = targetGroupId;
            }
        }

        try {
            await this.orm.write(this.resModel, [recordId], updates);
            return {success: true};
        } catch (error) {
            return {success: false, error: error.message};
        }
    }

    /**
     * Get records with valid coordinates.
     *
     * @returns {Array} Records with valid lat/lng
     */
    getLocatedRecords() {
        const {fieldLatitude, fieldLongitude} = this.archInfo;
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
        const {fieldLatitude, fieldLongitude} = this.archInfo;
        return this.data.records.filter((r) => {
            const lat = r[fieldLatitude];
            const lng = r[fieldLongitude];
            return !this._validateCoordinates(lat, lng);
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
}
