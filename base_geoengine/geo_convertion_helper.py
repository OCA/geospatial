# Copyright 2011-2012 Nicolas Bessi (Camptocamp SA)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
import logging

from odoo import _

try:
    import geojson
    from shapely import wkb, wkt
    from shapely.geometry import shape
    from shapely.geometry.base import BaseGeometry
except ImportError:
    logger = logging.getLogger(__name__)
    logger.warning(_("Shapely or geojson are not available in the sys path"))


def value_to_shape(value, use_wkb=False):
    """Transforms input into a Shapely object"""
    if not value:
        return wkt.loads("GEOMETRYCOLLECTION EMPTY")
    if isinstance(value, str):
        # We try to do this before parsing json exception
        # exception are ressource costly
        if "{" in value:
            geo_dict = geojson.loads(value)
            return shape(geo_dict)
        elif use_wkb:
            return wkb.loads(value, hex=True)
        else:
            return wkt.loads(value)
    elif hasattr(value, "wkt"):
        if isinstance(value, BaseGeometry):
            return value
        else:
            return wkt.loads(value.wkt)
    else:
        raise TypeError(
            _(
                "Write/create/search geo type must be wkt/geojson "
                "string or must respond to wkt"
            )
        )
