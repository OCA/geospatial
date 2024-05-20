/** @odoo-module **/

import {Component} from "@odoo/owl";
import {useModel} from "@web/model/model";
import {Layout} from "@web/search/layout";
import {extractFieldsFromArchInfo} from "@web/model/relational_model/utils";
import {session} from "@web/session";
import {useState} from "@web/core/utils/hooks";

export class MapController extends Component {
    setup() {
        this.archInfo = this.props.archInfo;
        this.model = useModel(this.props.Model, this.modelParams);
    }

    get modelParams() {
        const {defaultGroupBy, rawExpand} = this.archInfo;
        const {activeFields, fields} = extractFieldsFromArchInfo(
            this.archInfo,
            this.props.fields
        );

        const modelConfig = this.props.state?.modelState?.config || {
            resModel: this.props.resModel,
            fields,
            activeFields,
            openGroupsByDefault: rawExpand
                ? evaluateExpr(rawExpand, this.props.context)
                : false,
        };

        return {
            config: modelConfig,
            state: this.props.state?.modelState,
            limit: this.archInfo.limit || this.props.limit,
            countLimit: this.archInfo.countLimit,
            defaultOrderBy: this.archInfo.defaultOrder,
            defaultGroupBy: this.props.searchMenuTypes.includes("groupBy")
                ? defaultGroupBy
                : false,
            groupsLimit: this.archInfo.groupsLimit,
            multiEdit: this.archInfo.multiEdit,
            activeIdsLimit: session.active_ids_limit,
        };
    }

    _onClickLeafletPopup(ev) {
        ev.preventDefault();
        ev.data.current_object.trigger_up("switch_view", {
            view_type: "form",
            res_id: ev.data.res_id,
            model: ev.data.model_name,
        });
    }
}

MapController.template = "web_view_leaflet_map.MapController";
MapController.components = {Layout};
