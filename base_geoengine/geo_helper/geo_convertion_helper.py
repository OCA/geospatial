# -*- coding: utf-8 -*-
# Copyright 2011-2012 Nicolas Bessi (Camptocamp SA)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
import logging

try:
    from shapely import wkt
    from shapely.geometry import asShape
    from shapely.geometry.base import BaseGeometry
    import geojson
except ImportError:
    logger = logging.getLogger(__name__)
    logger.warning('Shapely or geojson are not available in the sys path')


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
        elif value:
            # if value is empty sting we return False to be orm coherent,
            # may be we should return an empty shapely
            shape_to_return = wkt.loads(value)
        else:
            return False
    elif hasattr(value, 'wkt'):
        if isinstance(value, BaseGeometry):
            shape_to_return = value
        else:
            shape_to_return = wkt.loads(value.wkt)
    else:
        raise TypeError('Write/create/search geo type must be wkt/geojson '
                        'string or must respond to wkt')
    return shape_to_return
