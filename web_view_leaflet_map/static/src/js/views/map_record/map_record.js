/** @odoo-module */

import {Field} from "@web/views/fields/field";
import {MapCompiler} from "../map_compiler";
import {INFO_BOX_ATTRIBUTE} from "../map_arch_parser";
import {registry} from "@web/core/registry";
import {useViewCompiler} from "@web/views/view_compiler";
import {Component, onWillUpdateProps} from "@odoo/owl";
import {useService} from "@web/core/utils/hooks";

const formatters = registry.category("formatters");

function getValue(record, fieldName) {
    const field = record.fields[fieldName];
    const value = record._values[fieldName];
    const formatter = formatters.get(field.type, String);
    return formatter(value, {field, data: record._values});
}

export class MapRecord extends Component {
    /**
     * Setup the record by compiling the arch and the info-box template.
     */
    setup() {
        this.user = useService("user");
        const {Compiler, templates} = this.props;
        const ViewCompiler = Compiler || this.constructor.Compiler;

        this.templates = useViewCompiler(ViewCompiler, templates);

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

    get renderingContext() {
        return {
            context: this.props.record.context,
            JSON,
            record: this.props.record,
            read_only_mode: this.props.readonly,
            selection_mode: this.props.forceGlobalClick,
            user_context: this.user.context,
            __comp__: Object.assign(Object.create(this), {this: this}),
        };
    }
}

MapRecord.template = "web_view_leaflet_map.MapRecord";
MapRecord.Compiler = MapCompiler;
MapRecord.components = {Field};
MapRecord.INFO_BOX_ATTRIBUTE = INFO_BOX_ATTRIBUTE;
