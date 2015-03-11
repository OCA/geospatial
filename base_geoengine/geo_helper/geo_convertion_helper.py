# -*- coding: utf-8 -*-
##############################################################################
#
#    Author: Nicolas Bessi
#    Copyright 2011-2012 Camptocamp SA
#
#    This program is free software: you can redistribute it and/or modify
#    it under the terms of the GNU Affero General Public License as
#    published by the Free Software Foundation, either version 3 of the
#    License, or (at your option) any later version.
#
#    This program is distributed in the hope that it will be useful,
#    but WITHOUT ANY WARRANTY; without even the implied warranty of
#    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#    GNU Affero General Public License for more details.
#
#    You should have received a copy of the GNU Affero General Public License
#    along with this program.  If not, see <http://www.gnu.org/licenses/>.
#
##############################################################################
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
