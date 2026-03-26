from pathlib import Path
from shutil import copy2
import os


def copy_configs_to_localappdata() -> None:
	script_dir = Path(__file__).resolve().parent
	source_dir = script_dir / "config"

	local_appdata = os.environ.get("LOCALAPPDATA")
	if not local_appdata:
		raise EnvironmentError("LOCALAPPDATA is not set.")

	target_dir = Path(local_appdata) / "clipforge" / "config"

	if not source_dir.exists() or not source_dir.is_dir():
		raise FileNotFoundError(f"Source config directory not found: {source_dir}")

	for src_file in source_dir.rglob("*"):
		if src_file.is_file():
			relative_path = src_file.relative_to(source_dir)
			dst_file = target_dir / relative_path
			dst_file.parent.mkdir(parents=True, exist_ok=True)
			copy2(src_file, dst_file)


if __name__ == "__main__":
	copy_configs_to_localappdata()
