# Copyright 2023 ACSONE SA/NV
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import random
import string

from odoo.models import BaseModel
from odoo.osv import expression
from odoo.osv.expression import TERM_OPERATORS
from odoo.tools import SQL, Query

from .fields import GeoField
from .geo_operators import GeoOperator

original___condition_to_sql = BaseModel._condition_to_sql

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
term_operators_list = list(TERM_OPERATORS)
for op in GEO_OPERATORS:
    term_operators_list.append(op)

expression.TERM_OPERATORS = tuple(term_operators_list)
expression.SQL_OPERATORS.update(GEO_SQL_OPERATORS)


def _condition_to_sql(
    self, alias: str, fname: str, operator: str, value, query: Query
) -> SQL:
    """
    This method has been monkey patched in order to be able to include
    geo_operators into the Odoo search method.
    """
    if operator in GEO_OPERATORS.keys():
        current_field = self._fields.get(fname)
        current_operator = GeoOperator(current_field)
        if current_field and isinstance(current_field, GeoField):
            params = []
            if isinstance(value, dict):
                # We are having indirect geo_operator like (‘geom’, ‘geo_...’,
                # {‘res.zip.poly’: [‘id’, ‘in’, [1,2,3]] })
                ref_search = value
                sub_queries = []
                for key in ref_search:
                    i = key.rfind(".")
                    rel_model = key[0:i]
                    rel_col = key[i + 1 :]
                    rel_model = self.env[rel_model]
                    # we compute the attributes search on spatial rel
                    if ref_search[key]:
                        rel_alias = (
                            rel_model._table
                            + "_"
                            + "".join(random.choices(string.ascii_lowercase, k=5))
                        )
                        rel_query = where_calc(
                            rel_model,
                            ref_search[key],
                            active_test=True,
                            alias=rel_alias,
                        )
                        self._apply_ir_rules(rel_query, "read")
                        if operator == "geo_equal":
                            rel_query.add_where(
                                f'"{alias}"."{fname}" {GEO_OPERATORS[operator]} '
                                f"{rel_alias}.{rel_col}"
                            )
                        elif operator in ("geo_greater", "geo_lesser"):
                            rel_query.add_where(
                                f"ST_Area({alias}.{fname}) {GEO_OPERATORS[operator]} "
                                f"ST_Area({rel_alias}.{rel_col})"
                            )
                        else:
                            rel_query.add_where(
                                f'{GEO_OPERATORS[operator]}("{alias}"."{fname}", '
                                f"{rel_alias}.{rel_col})"
                            )

                        subquery, subparams = rel_query.subselect("1")
                        sub_query_mogrified = (
                            self.env.cr.mogrify(subquery, subparams)
                            .decode("utf-8")
                            .replace(f"'{rel_model._table}'", f'"{rel_model._table}"')
                            .replace("%", "%%")
                        )
                        sub_queries.append(f"EXISTS({sub_query_mogrified})")
                query = " AND ".join(sub_queries)
            else:
                query = get_geo_func(
                    current_operator, operator, fname, value, params, self._table
                )
            return SQL(query, *params)
    return original___condition_to_sql(
        self, alias=alias, fname=fname, operator=operator, value=value, query=query
    )


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


def where_calc(model, domain, active_test=True, alias=None):
    """
    This method is copied from base, we need to create our own query.
    """
    # if the object has an active field ('active', 'x_active'), filter out all
    # inactive records unless they were explicitly asked for
    if model._active_name and active_test and model._context.get("active_test", True):
        # the item[0] trick below works for domain items and '&'/'|'/'!'
        # operators too
        if not any(item[0] == model._active_name for item in domain):
            domain = [(model._active_name, "=", 1)] + domain

    query = Query(model.env, alias, model._table)
    if domain:
        return expression.expression(domain, model, alias=alias, query=query).query
    return query


BaseModel._condition_to_sql = _condition_to_sql
