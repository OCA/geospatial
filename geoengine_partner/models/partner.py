# Copyright 2011-2017 Camptocamp SA
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl)

from odoo import api, fields, models


class ResPartner(models.Model):
    """Add partner_point to partner using a function filed"""
    _inherit = "res.partner"

    partner_point = fields.GeoPoint(string="Address coordinates")

    @api.depends('partner_latitude', 'partner_longitude')
    def _set_partner_point(self):
        """
        Set the `partner_point` of the partner depending of its `partner_latitude`
        and its `partner_longitude`
        **Notes**
        If one of those parameters is not set then reset the partner's
        partner_point and do not recompute it
        """
        if self.partner_latitude and self.partner_longitude:
            if not self.partner_point:
                print("lat {} , lon {} ".format(self.partner_latitude, self.partner_longitude))
                cr = self.env.cr
                self.partner_point = fields.GeoPoint.from_latlon(cr,
                    self.partner_latitude, self.partner_longitude)
        else:
            self.partner_point = False
