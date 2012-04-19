# -*- encoding: utf-8 -*-
##############################################################################
#
#    Author Nicolas Bessi. Copyright Camptocamp SA
##############################################################################
from __future__ import absolute_import 
from osv import fields
from . import geo_field

class GeoPoint(geo_field.Geom):
    """New type of column in the  ORM for POSTGIS geometry Point type"""
    _type = 'geo_point'
    def __init__(self, string, dim=2, srid=900913 , gist_index=True, **args):
        res = super(GeoPoint, self).__init__(string, "POINT", **args)
        return res

fields.geo_point = GeoPoint
