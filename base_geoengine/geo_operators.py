# Copyright 2011-2012 Nicolas Bessi (Camptocamp SA)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
import logging

UNION_MAPPING = {"|": "OR", "&": "AND"}

logger = logging.getLogger("geoengine.sql.debug")


# Deprecated : use the standard search.


class GeoOperator(object):
    def __init__(self, geo_field):
        self.geo_field = geo_field

    def get_rel_field(self, rel_col, rel_model):
        """Retrieves the expression to use in PostGIS statement for a spatial
        rel search"""
        try:
            rel_model._fields[rel_col]
        except Exception:
            raise Exception(
                "Model {} has no column {}".format(rel_model._name, rel_col)
            ) from None
        return "{}.{}".format(rel_model._table, rel_col)

    def _get_direct_como_op_sql(
        self, table, col, value, params, rel_col=None, rel_model=None, op=""
    ):
        """provide raw sql for geater and lesser operators"""
        if isinstance(value, (int, float)):
            if rel_col and rel_model:
                raise Exception(
                    "Area %s does not support int compare for relation "
                    "search" % (op,)
                )
            return " ST_Area({}.{}) {} {}".format(table, col, op, value)
        else:
            if rel_col and rel_model is not None:
                compare_to = self.get_rel_field(rel_col, rel_model)
                return " ST_Area({}.{}) {} ST_Area(ST_GeomFromText('{}'))".format(
                    table, col, op, compare_to
                )
            else:
                base = self.geo_field.entry_to_shape(value, same_type=False)
                compare_to = base.wkt
                params.append(base.wkt)
                return " ST_Area({}.{}) {} ST_Area(ST_GeomFromText(%s))".format(
                    table, col, op
                )

    def _get_postgis_comp_sql(
        self, table, col, value, params, rel_col=None, rel_model=None, op=""
    ):
        """return raw sql for all search based on St_**(a, b) posgis operator"""
        if rel_col and rel_model is not None:
            compare_to = self.get_rel_field(rel_col, rel_model)
        else:
            base = self.geo_field.entry_to_shape(value, same_type=False)
            srid = self.geo_field.srid
            params.append(base.wkt)
            params.append(srid)
            return f"{op}({table}.{col}, ST_GeomFromText(%s, %s))"
        return " {}({}.{}, {})".format(op, table, col, compare_to)

    def get_geo_greater_sql(
        self, table, col, value, params, rel_col=None, rel_model=None
    ):
        """Returns raw sql for geo_greater operator
        (used for area comparison)
        """
        return self._get_direct_como_op_sql(
            table, col, value, params, rel_col, rel_model, op=">"
        )

    def get_geo_lesser_sql(
        self, table, col, value, params, rel_col=None, rel_model=None
    ):
        """Returns raw sql for geo_lesser operator
        (used for area comparison)"""
        return self._get_direct_como_op_sql(
            table, col, value, params, rel_col, rel_model, op="<"
        )

    def get_geo_equal_sql(
        self, table, col, value, params, rel_col=None, rel_model=None
    ):
        """Returns raw sql for geo_equal operator
        (used for equality comparison)
        """
        if rel_col and rel_model is not None:
            compare_to = self.get_rel_field(rel_col, rel_model)
        else:
            base = self.geo_field.entry_to_shape(value, same_type=False)
            compare_to = "ST_GeomFromText(%s)"
            params.append(base.wkt)
        return " {}.{} = {}".format(table, col, compare_to)

    def get_geo_intersect_sql(
        self, table, col, value, params, rel_col=None, rel_model=None
    ):
        """Returns raw sql for geo_intersec operator
        (used for spatial comparison)
        """
        return self._get_postgis_comp_sql(
            table, col, value, params, rel_col, rel_model, op="ST_Intersects"
        )

    def get_geo_touch_sql(
        self, table, col, value, params, rel_col=None, rel_model=None
    ):
        """Returns raw sql for geo_touch operator
        (used for spatial comparison)
        """
        return self._get_postgis_comp_sql(
            table, col, value, params, rel_col, rel_model, op="ST_Touches"
        )

    def get_geo_within_sql(
        self, table, col, value, params, rel_col=None, rel_model=None
    ):
        """Returns raw sql for geo_within operator
        (used for spatial comparison)
        """
        return self._get_postgis_comp_sql(
            table, col, value, params, rel_col, rel_model, op="ST_Within"
        )

    def get_geo_contains_sql(
        self, table, col, value, params, rel_col=None, rel_model=None
    ):
        """Returns raw sql for geo_contains operator
        (used for spatial comparison)
        """
        return self._get_postgis_comp_sql(
            table, col, value, params, rel_col, rel_model, op="ST_Contains"
        )
