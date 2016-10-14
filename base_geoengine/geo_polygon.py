# -*- coding: utf-8 -*-
# Copyright 2011-2012 Nicolas Bessi (Camptocamp SA)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
from openerp.osv import fields
from . import geo_field


class GeoPolygon(geo_field.Geom):
    """New type of column in the  ORM for POSTGIS geometry Polygon type"""
    _type = 'geo_polygon'
    _geo_type = 'POLYGON'

    def __init__(self, string, dim=2, srid=900913, gist_index=True, **args):
        super(GeoPolygon, self).__init__(
            string, dim=dim, srid=srid, gist_index=gist_index,
            **args)

fields.geo_polygon = GeoPolygon
