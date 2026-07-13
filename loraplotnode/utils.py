"""
Small self-contained helpers used by LoRAPlotNode to support a dynamic,
UI-driven number of "lora row" inputs (on/off + lora name + strengths),
similar in spirit to rgthree-comfy's FlexibleOptionalInputType/AnyType,
but reimplemented here so this node has no dependency on rgthree-comfy
being installed.
"""

from typing import Union


class AnyType(str):
    """A string subclass that is never considered "not equal" to anything.

    ComfyUI uses type-name equality/inequality checks to validate links between
    node sockets. Returning an instance of this class as the "type" lets a slot
    accept (or pretend to match) any other type during those checks.
    """

    def __ne__(self, __value: object) -> bool:
        return False


any_type = AnyType("*")


class FlexibleOptionalInputType(dict):
    """A dict-like object usable as the "optional" section of INPUT_TYPES.

    Normally ComfyUI's INPUT_TYPES "optional" dict is static: every key it can
    ever contain must be declared ahead of time. This class instead always
    reports that it "contains" any key that's asked for (via __contains__),
    and returns a generic `(any_type,)` tuple for any key not present in the
    optional `data` mapping used to seed it. This lets a node accept an
    arbitrary, UI-controlled number of inputs (here: "lora_1", "lora_2", ...)
    without ComfyUI rejecting the extra keys during validation.
    """

    def __init__(self, type, data: Union[dict, None] = None):
        self.type = type
        self.data = data
        if self.data is not None:
            for k, v in self.data.items():
                self[k] = v

    def __getitem__(self, key):
        if self.data is not None and key in self.data:
            return self.data[key]
        return (self.type,)

    def __contains__(self, key):
        return True
