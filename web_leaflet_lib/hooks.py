def post_init_hook(env):
    """
    Update the default tile URL in demo data if needed.
    """
    base = env.ref("base.module_base")
    if base.demo:
        tile_url_param = env["ir.config_parameter"].search(
            [("key", "=", "leaflet.tile_url")]
        )
        if tile_url_param.value == "False":
            tile_url_param.value = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
