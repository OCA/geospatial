# -*- coding: utf-8 -*-
# Copyright 2011-2012 Nicolas Bessi (Camptocamp SA)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
from openerp.osv import fields
from . import geo_field


class GeoMultiLine(geo_field.Geom):
    """New type of column in the  ORM for POSTGIS geometry MultiLine type"""
    _type = 'geo_multi_line'
    _geo_type = 'MULTILINESTRING'

    def __init__(self, string, dim=2, srid=900913, gist_index=True, **args):
        super(GeoMultiLine, self).__init__(
            string, dim=dim, srid=srid,
            gist_index=gist_index, **args)

fields.geo_multi_line = GeoMultiLine
