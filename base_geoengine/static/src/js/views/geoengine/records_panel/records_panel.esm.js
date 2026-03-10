/** @odoo-module */

/**
 * Copyright 2023 ACSONE SA/NV
 */
import {Component, onWillStart, onWillUpdateProps, useState} from "@odoo/owl";

import {SearchBarRecords} from "./search_bar_records/search_bar_records.esm";
import {useService} from "@web/core/utils/hooks";

export class RecordsPanel extends Component {
    setup() {
        this.state = useState({
            isFolded: false,
            isClicked: 0,
            modelDescription: "",
            records: [],
        });
        this.orm = useService("orm");
        onWillStart(() => {
            this.state.records = this.props.list.records;
            // Retrieves the name of the current model
            this.orm
                .call("ir.model", "display_name_for", [[this.props.list.resModel]])
                .then(
                    (result) => (this.state.modelDescription = result[0].display_name)
                );
        });
        onWillUpdateProps((nextProps) => (this.state.records = nextProps.list.records));
    }

    /**
     * This method allows you to open/close the panel.
     */
    fold() {
        this.state.isFolded = !this.state.isFolded;
        this.state.records = this.props.list.records;
    }

    /**
     * This method reacts to the click on a record.
     * @param {*} record
     */
    onDisplayPopupRecord(record) {
        const rec = this.props.list.records.find((val) => val.id === record.id);
        this.state.isClicked = record.resId;
        this.props.onDisplayPopupRecord(rec);
    }

    /**
     * When you press a key, it automatically performs the search.
     * @param {*} value
     */
    onInputKeyup(value) {
        const val = this.filterItems(value, this.props.list.records);
        this.state.records = val;
    }

    /**
     * This method allows you to filter items according to the value passed in parameter.
     * @param {*} value
     * @param {*} items
     * @returns {*}
     */
    filterItems(value, items) {
        const lowerValue = value.toLowerCase();
        return items.filter(
            (item) => item.data.display_name.toLowerCase().indexOf(lowerValue) >= 0
        );
    }
}

RecordsPanel.template = "base_geoengine.RecordsPanel";
RecordsPanel.props = {
    list: {type: Object},
    onDisplayPopupRecord: {type: Function},
    zoomOnFeature: {type: Function},
    zoomOutOnFeature: {type: Function},
};
RecordsPanel.components = {SearchBarRecords};
