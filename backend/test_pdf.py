import pypdfium2 as pdfium

class NamedFileWrapper:
    def __init__(self, file_obj, name):
        self.file_obj = file_obj
        self.name = name

    def read(self, *args, **kwargs):
        return self.file_obj.read(*args, **kwargs)

    def seek(self, *args, **kwargs):
        return self.file_obj.seek(*args, **kwargs)

with open('dummy.pdf', 'wb') as f:
    f.write(b'%PDF-1.4\n')

with open('dummy.pdf', 'rb') as f:
    wrapper = NamedFileWrapper(f, 'dummy.pdf')
    try:
        pdf = pdfium.PdfDocument(wrapper)
        print("Success")
    except Exception as e:
        print("Error:", e)