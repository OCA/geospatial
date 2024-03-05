# -*- coding: utf-8 -*-
# Copyright 2024 Therp BV <https://therp.nl>
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).

from openerp import SUPERUSER_ID, api


def migrate(cr, version=None):
    env = api.Environment(cr, SUPERUSER_ID, {})
    partners = env['res.partner'].search([
        ('partner_latitude', '!=', False),
        ('partner_longitude', '!=', False)
    ])
    partners._recompute_todo(partners._fields['geo_point'])
    partners.recompute()
