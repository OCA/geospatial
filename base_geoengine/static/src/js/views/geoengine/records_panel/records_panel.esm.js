/** @odoo-module */

/**
 * Copyright 2023 ACSONE SA/NV
 */
import {useService} from "@web/core/utils/hooks";
import {SearchBarRecords} from "./search_bar_records/search_bar_records.esm";

const {Component, useState, onWillRender, onWillStart, onWillUpdateProps} = owl;

export class RecordsPanel extends Component {
    setup() {
        super.setup();

        this.state = useState({
            isFolded: false,
            isClicked: 0,
            modelDescription: "",
            records: [],
        });
        this.orm = useService("orm");
        onWillStart(() => (this.state.records = this.props.list.records));
        onWillUpdateProps((nextProps) => (this.state.records = nextProps.list.records));
        onWillRender(async () => {
            const result = await this.orm.call("ir.model", "display_name_for", [
                [this.props.list.resModel],
            ]);
            this.state.modelDescription = result[0].display_name;
        });
    }

    fold() {
        this.state.isFolded = !this.state.isFolded;
        this.state.records = this.props.list.records;
    }

    onDisplayPopupRecord(record) {
        const rec = this.props.list.records.find(
            (val) => val._values.id === record.resId
        );
        this.state.isClicked = record.resId;
        this.props.onDisplayPopupRecord(rec);
    }

    onInputKeyup(value) {
        const val = this.filterItems(value, this.props.list.records);
        this.state.records = val;
    }

    filterItems(value, items) {
        const lowerValue = value.toLowerCase();
        return items.filter(
            (item) => item.data.display_name.toLowerCase().indexOf(lowerValue) >= 0
        );
    }
}

RecordsPanel.template = "base_geoengine.RecordsPanel";
RecordsPanel.components = {SearchBarRecords};
