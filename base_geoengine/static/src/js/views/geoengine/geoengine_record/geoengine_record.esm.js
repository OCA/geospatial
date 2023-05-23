/** @odoo-module */

/**
 * Copyright 2023 ACSONE SA/NV
 */

import {Field} from "@web/views/fields/field";
import {GeoengineCompiler} from "../geoengine_compiler.esm";
import {INFO_BOX_ATTRIBUTE} from "../geoengine_arch_parser.esm";
import {registry} from "@web/core/registry";
import {useViewCompiler} from "@web/views/view_compiler";
import {Component, onWillUpdateProps} from "@odoo/owl";

const formatters = registry.category("formatters");

function getValue(record, fieldName) {
    const field = record.fields[fieldName];
    const value = record._values[fieldName];
    const formatter = formatters.get(field.type, String);
    return formatter(value, {field, data: record._values});
}

export class GeoengineRecord extends Component {
    /**
     * Setup the record by compiling the arch and the info-box template.
     */
    setup() {
        const {archInfo, templates} = this.props;
        const {arch} = archInfo;
        const ViewCompiler = this.constructor.Compiler;
        this.templates = useViewCompiler(ViewCompiler, arch, templates);
        this.createRecord(this.props);
        onWillUpdateProps(this.createRecord);
    }

    /**
     * Create record with formatter.
     * @param {*} props
     */
    createRecord(props) {
        const {record} = props;
        this.record = Object.create(null);
        for (const fieldName in record._values) {
            this.record[fieldName] = {
                get value() {
                    return getValue(record, fieldName);
                },
            };
        }
    }
}

GeoengineRecord.template = "base_geoengine_GeoengineRecord";
GeoengineRecord.Compiler = GeoengineCompiler;
GeoengineRecord.components = {Field};
GeoengineRecord.INFO_BOX_ATTRIBUTE = INFO_BOX_ATTRIBUTE;
