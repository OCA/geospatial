# -*- coding: utf-8 -*-
# Copryight 2017 Laslabs Inc.
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).

from odoo import api, SUPERUSER_ID


def _update_records_with_geopoint(cr, registry):
    with cr.savepoint():
        env = api.Environment(cr, SUPERUSER_ID, {})
        zips = env['res.better.zip'].search([])
        zips._compute_geo_point()
