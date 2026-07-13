from .nodes import LoRAPlotNode, LoRAPlotImageSaver

NODE_CLASS_MAPPINGS = {
    "LoRAPlotNode": LoRAPlotNode,
    "LoRAPlotImageSaver": LoRAPlotImageSaver
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "LoRAPlotNode": "LoRA Plot Node",
    "LoRAPlotImageSaver": "LoRA Plot Image Saver"
}

# Serves everything under ./web/ so the browser can load our custom widget JS
# (power-lora-loader style rows: per-lora on/off toggle + strength).
WEB_DIRECTORY = "./web"

__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS', 'WEB_DIRECTORY']
