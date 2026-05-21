from PIL import Image
import io

class NamedFileWrapper:
    def __init__(self, file_obj, name):
        self.file_obj = file_obj
        self.name = name

    def read(self, *args, **kwargs):
        return self.file_obj.read(*args, **kwargs)

    def seek(self, *args, **kwargs):
        return self.file_obj.seek(*args, **kwargs)

with open('dummy.jpg', 'wb') as f:
    f.write(b'\xff\xd8\xff')

with open('dummy.jpg', 'rb') as f:
    wrapper = NamedFileWrapper(f, 'dummy.jpg')
    try:
        wrapper.seek(0)
        img = Image.open(io.BytesIO(wrapper.read()))
        print("Success")
    except Exception as e:
        print("Error:", e)