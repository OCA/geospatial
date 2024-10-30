import setuptools

with open('VERSION.txt', 'r') as f:
    version = f.read().strip()

setuptools.setup(
    name="odoo-addons-oca-geospatial",
    description="Meta package for oca-geospatial Odoo addons",
    version=version,
    install_requires=[
        'odoo-addon-base_geoengine>=16.0dev,<16.1dev',
        'odoo-addon-base_geoengine_demo>=16.0dev,<16.1dev',
        'odoo-addon-base_geolocalize_company>=16.0dev,<16.1dev',
        'odoo-addon-geoengine_base_geolocalize>=16.0dev,<16.1dev',
        'odoo-addon-geoengine_partner>=16.0dev,<16.1dev',
        'odoo-addon-web_leaflet_lib>=16.0dev,<16.1dev',
        'odoo-addon-web_view_leaflet_map>=16.0dev,<16.1dev',
        'odoo-addon-web_view_leaflet_map_partner>=16.0dev,<16.1dev',
        'odoo-addon-website_geoengine>=16.0dev,<16.1dev',
        'odoo-addon-website_geoengine_store_locator>=16.0dev,<16.1dev',
    ],
    classifiers=[
        'Programming Language :: Python',
        'Framework :: Odoo',
        'Framework :: Odoo :: 16.0',
    ]
)
