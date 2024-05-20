# -*- coding: utf-8 -*-
# Copyright 2015 ACSONE SA/NV (<http://acsone.eu>)
# License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl.html).

from odoo import api
from odoo.addons.base_geoengine import geo_model
from odoo.addons.base_geoengine import fields as geo_fields


class ResPartner(geo_model.GeoModel):
    """Add geo_point to partner using a function field"""
    _inherit = "res.partner"

    @api.multi
    @api.depends('partner_latitude', 'partner_longitude')
    def _compute_geo_point(self):
        """
        Set the `geo_point` of the partner depending of its `partner_latitude`
        and its `partner_longitude`
        **Notes**
        If one of those parameters is not set then reset the partner's
        geo_point and do not recompute it
        """
        for rec in self:
            if not rec.partner_latitude or not rec.partner_longitude:
                rec.geo_point = False
            else:
                rec.geo_point = geo_fields.GeoPoint.from_latlon(
                    rec.env.cr, rec.partner_latitude, rec.partner_longitude)

    geo_point = geo_fields.GeoPoint(
        store=True, compute='_compute_geo_point', inverse='_inverse_geo_point')

    @api.multi
    def _inverse_geo_point(self):
        for rec in self:
            if not rec.geo_point:
                rec.partner_longitude, rec.partner_latitude = False, False
            else:
                rec.partner_longitude, rec.partner_latitude = \
                    geo_fields.GeoPoint.to_latlon(rec.env.cr, rec.geo_point)
