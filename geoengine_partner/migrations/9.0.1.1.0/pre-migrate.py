# -*- coding: utf-8 -*-
# Copyright 2024 Tom Blauwendraat <tom@sunflowerweb.nl>
# License LGPL-3.0 or later (http://www.gnu.org/licenses/lgpl).
# pragma: no-cover


def migrate(cr, version):
    """Drop column geo_point of partner, because it's in a different SRID """
    cr.execute("select find_srid('public', 'res_partner', 'geo_point')")
    srid = cr.fetchone()[0]
    if srid != 3857:
        cr.execute(
            "ALTER TABLE res_partner DROP COLUMN geo_point"
        )
