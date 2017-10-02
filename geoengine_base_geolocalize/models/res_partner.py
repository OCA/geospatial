# -*- coding: utf-8 -*-
# Copyright 2015 ACSONE SA/NV (<http://acsone.eu>)
# License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl.html).

import logging
from odoo import api, fields
from odoo import exceptions
from odoo.tools.translate import _
from odoo.addons.base_geoengine import geo_model
from odoo.addons.base_geoengine import fields as geo_fields

try:
    import requests
except ImportError:
    logger = logging.getLogger(__name__)
    logger.warning('requests is not available in the sys path')

_logger = logging.getLogger(__name__)


class ResPartner(geo_model.GeoModel):
    """Add geo_point to partner using a function field"""
    _inherit = "res.partner"

    @api.multi
    def geocode_address(self):
        """Get the latitude and longitude by requesting "mapquestapi"
        see http://open.mapquestapi.com/geocoding/
        """
        self.ensure_one()
        values = self.env[
            'geoengine.geolocalize.openstreetmap'
        ]._geocode_address(
            self.street or '',
            self.zip or '',
            self.city or '',
            self.state_id and self.state_id.name or '',
            self.country_id and self.country_id.name or '',
            self.country_id and self.country_id.code or '',
        )
        self.write({
            'partner_latitude': values.get('lat'),
            'partner_longitude': values.get('lon'),
            'date_localization': fields.Date.today()
        })

    @api.multi
    def geo_localize(self):
        self.ensure_one()
        self.geocode_address()
        return True

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
        readonly=True, store=True, compute='_compute_geo_point')
