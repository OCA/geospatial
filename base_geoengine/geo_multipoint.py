# -*- encoding: utf-8 -*-
##############################################################################
#
#    Author Nicolas Bessi. Copyright Camptocamp SA
##############################################################################
from __future__ import absolute_import 
from osv import fields
from . import geo_field

class GeoMultiPoint(geo_field.Geom):
    """New type of column in the  ORM for POSTGIS geometry MultiPoint type"""
    _type = 'geo_multi_point'

    def __init__(self, string, dim=2, srid=900913 , gist_index=True, **args):
        res = super(GeoMultiPoint, self).__init__(string, "MULTIPOINT", **args)
        return res

fields.geo_multi_point = GeoMultiPoint
