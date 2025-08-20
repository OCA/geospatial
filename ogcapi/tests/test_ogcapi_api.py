from odoo.tests.common import TransactionCase

from .. import BadRequestException


class TestOgcapiApi(TransactionCase):
    def setUp(self):
        super().setUp()
        self.feature_1 = self.env["ogcapi.test.feature"].create(
            {
                "name": "Feature 1",
                "the_geom": "POINT(726469 5873145)",
            }
        )
        self.feature_2 = self.env["ogcapi.test.feature"].create(
            {
                "name": "Feature 2",
                "the_geom": "POINT(725995 5870504)",
            }
        )
        geo_field = self.env["ir.model.fields"].search(
            [("model", "=", "ogcapi.test.feature"), ("name", "=", "the_geom")], limit=1
        )
        # Create demo workspace and collection records here
        self.workspace = self.env["ogcapi.workspace"].create(
            {
                "name": "Test Workspace",
                "slug": "test-workspace",
                "title": "Test Workspace Title",
                "description": "This is a test workspace for OGC API",
            }
        )
        self.collection = self.env["ogcapi.collection"].create(
            {
                "name": "Test Collection",
                "slug": "test-collection",
                "title": "Test Collection Title",
                "workspace_id": self.workspace.id,
                "model_id": self.env.ref("ogcapi.model_ogcapi_test_feature").id,
                "geo_field_id": geo_field.id,
                "geo_field_name": "the_geom",
                "geo_type": "Point",
                "geo_srid": 3857,
                "geo_view_fields": "name",
            }
        )
        self.api = self.env["ogcapi.api"].search([], limit=1)

    def test_get_landing_success(self):
        pargs = {"workspaceId": self.workspace.slug}
        response = self.api.get_landing(pargs=pargs)
        self.assertIn("links", response["data"])

    def test_get_landing_missing_workspace(self):
        pargs = {}
        with self.assertRaises(BadRequestException):
            self.api.get_landing(pargs=pargs)

    def test_get_landing_wrong_workspace(self):
        pargs = {"workspaceId": "wrong-workspace"}
        with self.assertRaises(BadRequestException):
            self.api.get_landing(pargs=pargs)

    def test_get_conformance_success(self):
        pargs = {"workspaceId": self.workspace.slug}
        response = self.api.get_conformance(pargs=pargs)
        self.assertIn("links", response["data"])

    def test_get_conformance_missing_workspace(self):
        pargs = {}
        with self.assertRaises(BadRequestException):
            self.api.get_conformance(pargs=pargs)

    def test_get_conformance_wrong_workspace(self):
        pargs = {"workspaceId": "wrong-workspace"}
        with self.assertRaises(BadRequestException):
            self.api.get_conformance(pargs=pargs)

    def test_get_openapi_success(self):
        response = self.api.get_openapi()
        self.assertIn("openapi", response["data"])

    def test_get_collections_success(self):
        pargs = {"workspaceId": self.workspace.slug}
        response = self.api.get_collections(pargs=pargs)
        self.assertIn("collections", response["data"])

    def test_get_collections_missing_workspace(self):
        pargs = {}
        with self.assertRaises(BadRequestException):
            self.api.get_collections(pargs=pargs)

    def test_get_collections_wrong_workspace(self):
        pargs = {"workspaceId": "wrong-workspace"}
        with self.assertRaises(BadRequestException):
            self.api.get_collections(pargs=pargs)

    def test_get_collection_success(self):
        pargs = {
            "workspaceId": self.workspace.slug,
            "collectionId": self.collection.slug,
        }
        response = self.api.get_collection(pargs=pargs)
        self.assertIn("links", response["data"])

    def test_get_collection_missing_params(self):
        pargs = {"workspaceId": self.workspace.slug}
        with self.assertRaises(BadRequestException):
            self.api.get_collection(pargs=pargs)

    def test_get_schema_success(self):
        pargs = {
            "workspaceId": self.workspace.slug,
            "collectionId": self.collection.slug,
        }
        response = self.api.get_schema(pargs=pargs)
        self.assertIsInstance(response["data"], dict)

    def test_get_schema_missing_params(self):
        pargs = {"workspaceId": self.workspace.slug}
        with self.assertRaises(BadRequestException):
            self.api.get_schema(pargs=pargs)

    def test_get_items_success(self):
        pargs = {
            "workspaceId": self.workspace.slug,
            "collectionId": self.collection.slug,
        }
        response = self.api.get_items(pargs=pargs)
        self.assertIn("links", response["data"])

    def test_get_items_missing_params(self):
        pargs = {"workspaceId": self.workspace.slug}
        with self.assertRaises(BadRequestException):
            self.api.get_items(pargs=pargs)

    def test_get_item_success(self):
        pargs = {
            "workspaceId": self.workspace.slug,
            "collectionId": self.collection.slug,
            "featureId": self.feature_1.id,
        }
        response = self.api.get_item(pargs=pargs)
        self.assertIn("id", response["data"])
        self.assertEqual(response["data"]["id"], self.feature_1.id)

    def test_get_item_missing_params(self):
        pargs = {
            "workspaceId": self.workspace.slug,
            "collectionId": self.collection.slug,
        }
        with self.assertRaises(BadRequestException):
            self.api.get_item(pargs=pargs)
