# -*- encoding: utf-8 -*-
##############################################################################
#
#    Author Nicolas Bessi. Copyright Camptocamp SA
##############################################################################
from shapely.wkb import dumps as wkbdumps, loads as  wkbloads
from shapely.wkt import dumps as wktdumps, loads as  wktloads
from shapely.geometry import asShape
import geojson

def value_to_shape(value):
    """Transforms input into a Shapely object."""
    shape_to_return = False
    if not value:
        return wktloads('GEOMETRYCOLLECTION EMPTY')
    if isinstance(value, basestring):
        # We try to do this before parsing json exception
        # exception are ressource costly
        if value.find('{') > -1:
            geo_dict = geojson.loads(value)
            shape_to_return = asShape(geo_dict)
        elif value :
            shape_to_return = wktloads(value)
        else:
            return False
    elif hasattr(value, 'wkt'):
        #Nasty but did not find equivalent of base string for shapely
        if str(type(value)).find('shapely.geometry') > -1:
            shape_to_return = value
        else:
            shape_to_return = wktloads(getattr(value, 'wkt'))
    else:
        raise TypeError('Write/create/search geo type must be wkt/geojson '
                        'string or must respond to wkt')
    return shape_to_return
