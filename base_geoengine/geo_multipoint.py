# -*- coding: utf-8 -*-
# Copyright 2011-2012 Nicolas Bessi (Camptocamp SA)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
from openerp.osv import fields
from . import geo_field


class GeoMultiPoint(geo_field.Geom):
    """New type of column in the  ORM for POSTGIS geometry MultiPoint type"""
    _type = 'geo_multi_point'
    _geo_type = 'MULTIPOINT'

    def __init__(self, string, dim=2, srid=900913, gist_index=True, **args):
        super(GeoMultiPoint, self).__init__(
            string, dim=dim, srid=srid, gist_index=gist_index,
            **args)

fields.geo_multi_point = GeoMultiPoint
