import setuptools

with open('VERSION.txt', 'r') as f:
    version = f.read().strip()

setuptools.setup(
    name="odoo8-addons-oca-geospatial",
    description="Meta package for oca-geospatial Odoo addons",
    version=version,
    install_requires=[
        'odoo8-addon-base_geoengine',
        'odoo8-addon-base_geoengine_demo',
        'odoo8-addon-geoengine_base_geolocalize',
        'odoo8-addon-geoengine_geoname_geocoder',
        'odoo8-addon-geoengine_partner',
        'odoo8-addon-geoengine_project',
        'odoo8-addon-geoengine_sale',
    ],
    classifiers=[
        'Programming Language :: Python',
        'Framework :: Odoo',
    ]
)
