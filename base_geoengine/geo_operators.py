# Copyright 2011-2012 Nicolas Bessi (Camptocamp SA)
# Copyright 2023 ACSONE SA/NV
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).


class GeoOperator:
    def __init__(self, geo_field):
        self.geo_field = geo_field

    def _get_direct_como_op_sql(self, table, col, value, params, op=""):
        """provide raw sql for geater and lesser operators"""
        if isinstance(value, int | float):
            return f" ST_Area({table}.{col}) {op} {value}"
        else:
            base = self.geo_field.entry_to_shape(value, same_type=False)
            params.append(base.wkt)
            return f" ST_Area({table}.{col}) {op} ST_Area(ST_GeomFromText(%s))"

    def _get_postgis_comp_sql(self, table, col, value, params, op=""):
        """return raw sql for all search based on St_**(a, b) posgis operator"""
        base = self.geo_field.entry_to_shape(value, same_type=False)
        srid = self.geo_field.srid
        params.append(base.wkt)
        params.append(srid)
        return f"{op}({table}.{col}, ST_GeomFromText(%s, %s))"

    def get_geo_greater_sql(self, table, col, value, params):
        """Returns raw sql for geo_greater operator
        (used for area comparison)
        """
        return self._get_direct_como_op_sql(table, col, value, params, op=">")

    def get_geo_lesser_sql(self, table, col, value, params):
        """Returns raw sql for geo_lesser operator
        (used for area comparison)"""
        return self._get_direct_como_op_sql(table, col, value, params, op="<")

    def get_geo_equal_sql(
        self,
        table,
        col,
        value,
        params,
    ):
        """Returns raw sql for geo_equal operator
        (used for equality comparison)
        """
        base = self.geo_field.entry_to_shape(value, same_type=False)
        compare_to = "ST_GeomFromText(%s)"
        params.append(base.wkt)
        return f" {table}.{col} = {compare_to}"

    def get_geo_intersect_sql(self, table, col, value, params):
        """Returns raw sql for geo_intersec operator
        (used for spatial comparison)
        """
        return self._get_postgis_comp_sql(table, col, value, params, op="ST_Intersects")

    def get_geo_touch_sql(self, table, col, value, params):
        """Returns raw sql for geo_touch operator
        (used for spatial comparison)
        """
        return self._get_postgis_comp_sql(table, col, value, params, op="ST_Touches")

    def get_geo_within_sql(self, table, col, value, params):
        """Returns raw sql for geo_within operator
        (used for spatial comparison)
        """
        return self._get_postgis_comp_sql(table, col, value, params, op="ST_Within")

    def get_geo_contains_sql(self, table, col, value, params):
        """Returns raw sql for geo_contains operator
        (used for spatial comparison)
        """
        return self._get_postgis_comp_sql(table, col, value, params, op="ST_Contains")
