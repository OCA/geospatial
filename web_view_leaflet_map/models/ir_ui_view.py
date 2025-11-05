# Copyright (C) 2019, Open Source Integrators
# Copyright (C) 2022 - Today: GRAP (http://www.grap.coop)
# @author: Sylvain LE GAL (https://twitter.com/legalsylvain)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).

from odoo import fields, models


class IrUiView(models.Model):
    _inherit = "ir.ui.view"

    type = fields.Selection(selection_add=[("leaflet_map", "Leaflet Map")])

    def _get_view_info(self):
        return {"leaflet_map": {"icon": "fa fa-map-o"}} | super()._get_view_info()
