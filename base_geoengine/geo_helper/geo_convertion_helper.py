# -*- encoding: utf-8 -*-
##############################################################################
#
#    Author Nicolas Bessi. Copyright Camptocamp SA
##############################################################################
from shapely import wkt
from shapely.geometry import asShape
import geojson

def value_to_shape(value):
    """Transforms input into a Shapely object"""
    if not value:
        return wkt.loads('GEOMETRYCOLLECTION EMPTY')
    if isinstance(value, basestring):
        # We try to do this before parsing json exception
        # exception are ressource costly
        if '{' in value:
            geo_dict = geojson.loads(value)
            shape_to_return = asShape(geo_dict)
        else:
            shape_to_return = wkt.loads(value)
    elif hasattr(value, 'wkt'):
        #Nasty but did not find equivalent of base string for shapely
        if 'shapely.geometry' in str(type(value)):
            shape_to_return = value
        else:
            shape_to_return = wkt.loads(value.wkt)
    else:
        raise TypeError('Write/create/search geo type must be wkt/geojson '
                        'string or must respond to wkt')
    return shape_to_return
