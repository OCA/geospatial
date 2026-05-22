# Copyright 2023 ACSONE SA/NV
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

from odoo.fields import Domain
from odoo.orm.domains import operator_optimization
from odoo.tools import SQL

from .fields import GeoField
from .geo_operators import GeoOperator

GEO_OPERATORS = {
    "geo_greater": ">",
    "geo_lesser": "<",
    "geo_equal": "=",
    "geo_touch": "ST_Touches",
    "geo_within": "ST_Within",
    "geo_contains": "ST_Contains",
    "geo_intersect": "ST_Intersects",
}
GEO_SQL_OPERATORS = {
    "geo_greater": SQL(">"),
    "geo_lesser": SQL("<"),
    "geo_equal": SQL("="),
    "geo_touch": SQL("ST_Touches"),
    "geo_within": SQL("ST_Within"),
    "geo_contains": SQL("ST_Contains"),
    "geo_intersect": SQL("ST_Intersects"),
}


@operator_optimization(GEO_OPERATORS.keys())
def _optimize_geo_condition(condition, model):
    if not isinstance(model._fields.get(condition.field_expr), GeoField):
        return condition
    return Domain.custom(
        to_sql=lambda model, alias, query: _geo_condition_to_sql(
            model,
            alias,
            condition.field_expr,
            condition.operator,
            condition.value,
            query,
        )
    )


def _geo_condition_to_sql(
    model, alias: str, fname: str, operator: str, value, query
) -> SQL:
    """
    Return SQL for custom geo operators used in Odoo domains.
    """
    if operator in GEO_OPERATORS.keys():
        current_field = model._fields.get(fname)
        current_operator = GeoOperator(current_field)
        if current_field and isinstance(current_field, GeoField):
            model._check_field_access(current_field, "read")
            params = []
            if isinstance(value, dict):
                # We are having indirect geo_operator like (?geom?, ?geo_...?,
                # {?res.zip.poly?: [?id?, ?in?, [1,2,3]] })
                ref_search = value
                sub_queries = []
                for key in ref_search:
                    i = key.rfind(".")
                    rel_model = key[0:i]
                    rel_col = key[i + 1 :]
                    rel_model = model.env[rel_model]
                    # we compute the attributes search on spatial rel
                    if ref_search[key]:
                        rel_query = where_calc(
                            rel_model,
                            ref_search[key],
                            active_test=True,
                        )
                        rel_alias = rel_query.table
                        left = SQL.identifier(alias, fname)
                        right = SQL.identifier(rel_alias, rel_col)
                        if operator == "geo_equal":
                            rel_query.add_where(SQL("%s = %s", left, right))
                        elif operator in ("geo_greater", "geo_lesser"):
                            rel_query.add_where(
                                SQL(
                                    "ST_Area(%s) %s ST_Area(%s)",
                                    left,
                                    GEO_SQL_OPERATORS[operator],
                                    right,
                                )
                            )
                        else:
                            rel_query.add_where(
                                SQL(
                                    "%s(%s, %s)",
                                    GEO_SQL_OPERATORS[operator],
                                    left,
                                    right,
                                )
                            )

                        sub_queries.append(SQL("EXISTS%s", rel_query.subselect("1")))
                return SQL(" AND ").join(sub_queries) if sub_queries else SQL("TRUE")
            else:
                query = get_geo_func(
                    current_operator, operator, fname, value, params, alias
                )
            return SQL(query, *params)
    raise NotImplementedError(f"The operator {operator} is not supported")


def get_geo_func(current_operator, operator, left, value, params, table):
    """
    This method will call the SQL query corresponding to the requested geo operator
    """
    match operator:
        case "geo_greater":
            query = current_operator.get_geo_greater_sql(table, left, value, params)
        case "geo_lesser":
            query = current_operator.get_geo_lesser_sql(table, left, value, params)
        case "geo_equal":
            query = current_operator.get_geo_equal_sql(table, left, value, params)
        case "geo_touch":
            query = current_operator.get_geo_touch_sql(table, left, value, params)
        case "geo_within":
            query = current_operator.get_geo_within_sql(table, left, value, params)
        case "geo_contains":
            query = current_operator.get_geo_contains_sql(table, left, value, params)
        case "geo_intersect":
            query = current_operator.get_geo_intersect_sql(table, left, value, params)
        case _:
            raise NotImplementedError(f"The operator {operator} is not supported")
    return query


def where_calc(model, domain, active_test=True):
    """
    Build a query for a related model while preserving the Odoo 19 domain flow.
    """
    return model._search(domain, active_test=active_test)
