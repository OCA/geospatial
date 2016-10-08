# -*- coding: utf-8 -*-
# Copyright 2011-2016 Camptocamp SA
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
import geojson

from openerp import api, fields
from openerp.addons.base_geoengine import geo_model
from openerp.addons.base_geoengine import fields as geo_fields


class RetailMachine(geo_model.GeoModel):
    """GEO OSV SAMPLE"""

    _name = "geoengine.demo.automatic.retailing.machine"

    the_point = geo_fields.GeoPoint('Coordinate')
    the_line = geo_fields.GeoLine('Power supply line', index=True)
    total_sales = fields.Float('Total sale', index=True)
    money_level = fields.Char('Money level', size=32, index=True)
    state = fields.Selection([('hs', 'HS'),
                              ('ok', 'OK')],
                             'State',
                             index=True)
    name = fields.Char('Serial number', size=64, required=True)
    zip_id = fields.Many2one('dummy.zip')

    @api.onchange('the_point')
    def onchange_geo_point(self):
        """ Exemple of on change on the point
        Lookup in zips if the code is within an area.

        Change the zip_id field accordingly
        """
        if self.the_point:
            x, y = geojson.loads(self.the_point).coordinates
            point = "POINT({} {})".format(x, y)
            zip_match = self.env['dummy.zip'].geo_search(
                geo_domain=[('the_geom', 'geo_contains', point)],
                limit=1
            )
            if zip_match:
                self.zip_id = zip_match[0]
