import modal
print(f"Modal Version: {modal.__version__}")
try:
    print(f"modal.Mount: {modal.Mount}")
    print("modal.Mount is available")
except AttributeError:
    print("modal.Mount is NOT available")
    try:
        from modal import Mount
        print(f"from modal import Mount: {Mount}")
    except ImportError:
        print("from modal import Mount FAILED")

try:
    print(f"modal.Image.add_local_dir: {modal.Image.add_local_dir}")
except AttributeError:
    print("modal.Image.add_local_dir NOT available")
