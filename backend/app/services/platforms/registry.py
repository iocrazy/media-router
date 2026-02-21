from app.services.platforms.base import PlatformAdapter

_adapters: dict[str, PlatformAdapter] = {}


def register(adapter: PlatformAdapter):
    _adapters[adapter.platform_name] = adapter


def get_adapter(platform: str) -> PlatformAdapter:
    adapter = _adapters.get(platform)
    if not adapter:
        raise ValueError(f"Unsupported platform: {platform}")
    return adapter


def get_all_platforms() -> list[str]:
    return list(_adapters.keys())


def _register_all():
    from app.services.platforms.douyin import DouyinAdapter
    register(DouyinAdapter())

_register_all()
