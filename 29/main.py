import os
import tkinter as tk
from tkinter import ttk, filedialog, messagebox, colorchooser
from PIL import Image, ImageTk
from image_processor import ImageProcessor, batch_rename
from task_queue import BatchProcessor, ProcessingTask
from history_manager import HistoryManager
from config import (
    SUPPORTED_FORMATS, WATERMARK_POSITIONS, INTERPOLATION_METHODS,
    FILTER_NAMES, RENAME_MODES, ROTATE_OPTIONS, CROP_MODES, FORMAT_EXTENSIONS
)


class ImageBatchProcessorApp:
    def __init__(self, root):
        self.root = root
        self.root.title("图像批量处理工具")
        self.root.geometry("1400x900")
        self.root.minsize(1200, 800)

        self.processor = ImageProcessor()
        self.batch_processor = BatchProcessor()
        self.history_manager = HistoryManager()

        self.preview_image_tk = None
        self.original_preview_tk = None
        self.preview_file = None

        self.setup_ui()
        self.setup_callbacks()

    def setup_ui(self):
        main_paned = ttk.PanedWindow(self.root, orient=tk.HORIZONTAL)
        main_paned.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)

        left_frame = ttk.Frame(main_paned, width=350)
        main_paned.add(left_frame, weight=1)

        center_frame = ttk.Frame(main_paned)
        main_paned.add(center_frame, weight=3)

        right_frame = ttk.Frame(main_paned, width=380)
        main_paned.add(right_frame, weight=1)

        self.setup_file_panel(left_frame)
        self.setup_preview_panel(center_frame)
        self.setup_control_panel(right_frame)

        bottom_frame = ttk.Frame(self.root)
        bottom_frame.pack(fill=tk.X, padx=5, pady=5)
        self.setup_progress_panel(bottom_frame)

    def setup_file_panel(self, parent):
        file_frame = ttk.LabelFrame(parent, text="图片文件", padding=5)
        file_frame.pack(fill=tk.BOTH, expand=True)

        btn_frame = ttk.Frame(file_frame)
        btn_frame.pack(fill=tk.X, pady=(0, 5))

        ttk.Button(btn_frame, text="添加文件", command=self.add_files).pack(side=tk.LEFT, padx=2)
        ttk.Button(btn_frame, text="添加文件夹", command=self.add_folder).pack(side=tk.LEFT, padx=2)
        ttk.Button(btn_frame, text="移除", command=self.remove_file).pack(side=tk.LEFT, padx=2)
        ttk.Button(btn_frame, text="清空", command=self.clear_files).pack(side=tk.LEFT, padx=2)

        self.file_listbox = tk.Listbox(file_frame, selectmode=tk.EXTENDED, height=15)
        scrollbar = ttk.Scrollbar(file_frame, orient=tk.VERTICAL, command=self.file_listbox.yview)
        self.file_listbox.configure(yscrollcommand=scrollbar.set)
        self.file_listbox.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.file_listbox.bind('<<ListboxSelect>>', self.on_file_select)

        output_frame = ttk.LabelFrame(parent, text="输出设置", padding=5)
        output_frame.pack(fill=tk.X, pady=5)

        ttk.Label(output_frame, text="输出目录:").pack(anchor=tk.W)
        output_path_frame = ttk.Frame(output_frame)
        output_path_frame.pack(fill=tk.X, pady=2)
        self.output_dir_var = tk.StringVar()
        ttk.Entry(output_path_frame, textvariable=self.output_dir_var).pack(side=tk.LEFT, fill=tk.X, expand=True)
        ttk.Button(output_path_frame, text="...", width=3, command=self.choose_output_dir).pack(side=tk.RIGHT)

    def setup_preview_panel(self, parent):
        preview_frame = ttk.LabelFrame(parent, text="预览", padding=5)
        preview_frame.pack(fill=tk.BOTH, expand=True)

        btn_bar = ttk.Frame(preview_frame)
        btn_bar.pack(fill=tk.X, pady=(0, 5))

        ttk.Button(btn_bar, text="原图", command=self.show_original).pack(side=tk.LEFT, padx=2)
        ttk.Button(btn_bar, text="应用预览", command=self.apply_preview).pack(side=tk.LEFT, padx=2)
        ttk.Button(btn_bar, text="重置", command=self.reset_preview).pack(side=tk.LEFT, padx=2)
        ttk.Button(btn_bar, text="添加到任务队列", command=self.add_current_to_queue).pack(side=tk.LEFT, padx=2)

        info_frame = ttk.Frame(btn_bar)
        info_frame.pack(side=tk.RIGHT)
        self.info_label = ttk.Label(info_frame, text="尺寸: - | 格式: -")
        self.info_label.pack(side=tk.RIGHT)

        compare_frame = ttk.Frame(preview_frame)
        compare_frame.pack(fill=tk.BOTH, expand=True)

        orig_frame = ttk.LabelFrame(compare_frame, text="原图", padding=3)
        orig_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=2)
        self.original_canvas = tk.Canvas(orig_frame, bg='#333', highlightthickness=0)
        self.original_canvas.pack(fill=tk.BOTH, expand=True)

        processed_frame = ttk.LabelFrame(compare_frame, text="处理后", padding=3)
        processed_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=2)
        self.preview_canvas = tk.Canvas(processed_frame, bg='#333', highlightthickness=0)
        self.preview_canvas.pack(fill=tk.BOTH, expand=True)

    def setup_control_panel(self, parent):
        self.control_notebook = ttk.Notebook(parent)
        self.control_notebook.pack(fill=tk.BOTH, expand=True)

        self.setup_resize_tab(self.control_notebook)
        self.setup_convert_tab(self.control_notebook)
        self.setup_filter_tab(self.control_notebook)
        self.setup_watermark_tab(self.control_notebook)
        self.setup_rename_tab(self.control_notebook)
        self.setup_crop_tab(self.control_notebook)
        self.setup_rotate_tab(self.control_notebook)
        self.setup_colors_tab(self.control_notebook)
        self.setup_beautify_tab(self.control_notebook)
        self.setup_queue_tab(self.control_notebook)
        self.setup_history_tab(self.control_notebook)

    def setup_resize_tab(self, notebook):
        tab = ttk.Frame(notebook, padding=10)
        notebook.add(tab, text="尺寸调整")

        mode_frame = ttk.Frame(tab)
        mode_frame.pack(fill=tk.X, pady=5)
        self.resize_mode = tk.StringVar(value="pixel")
        ttk.Radiobutton(mode_frame, text="指定像素", variable=self.resize_mode, value="pixel", command=self.update_resize_mode).pack(side=tk.LEFT, padx=5)
        ttk.Radiobutton(mode_frame, text="百分比", variable=self.resize_mode, value="percent", command=self.update_resize_mode).pack(side=tk.LEFT, padx=5)

        self.pixel_frame = ttk.Frame(tab)
        self.pixel_frame.pack(fill=tk.X, pady=5)
        ttk.Label(self.pixel_frame, text="宽度:").grid(row=0, column=0, sticky=tk.W, pady=2)
        self.resize_width = tk.IntVar(value=1920)
        ttk.Entry(self.pixel_frame, textvariable=self.resize_width, width=10).grid(row=0, column=1, pady=2, padx=5)
        ttk.Label(self.pixel_frame, text="px").grid(row=0, column=2, sticky=tk.W)
        ttk.Label(self.pixel_frame, text="高度:").grid(row=1, column=0, sticky=tk.W, pady=2)
        self.resize_height = tk.IntVar(value=1080)
        ttk.Entry(self.pixel_frame, textvariable=self.resize_height, width=10).grid(row=1, column=1, pady=2, padx=5)
        ttk.Label(self.pixel_frame, text="px").grid(row=1, column=2, sticky=tk.W)

        self.keep_aspect = tk.BooleanVar(value=True)
        self.keep_aspect_checkbox = ttk.Checkbutton(tab, text="保持宽高比", variable=self.keep_aspect)
        self.keep_aspect_checkbox.pack(anchor=tk.W, pady=5)

        stretch_frame = ttk.Frame(tab)
        stretch_frame.pack(fill=tk.X, pady=5)
        self.force_stretch = tk.BooleanVar(value=False)
        ttk.Checkbutton(stretch_frame, text="强制拉伸(不保持比例)", variable=self.force_stretch).pack(side=tk.LEFT)

        self.percent_frame = ttk.Frame(tab)
        ttk.Label(self.percent_frame, text="缩放比例:").pack(side=tk.LEFT)
        self.resize_percent = tk.IntVar(value=100)
        self.percent_scale = ttk.Scale(self.percent_frame, from_=10, to=200, variable=self.resize_percent, orient=tk.HORIZONTAL)
        self.percent_scale.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=5)
        self.percent_label = ttk.Label(self.percent_frame, text="100%")
        self.percent_label.pack(side=tk.LEFT)
        self.resize_percent.trace_add('write', lambda *args: self.percent_label.config(text=f"{self.resize_percent.get()}%"))

        interp_frame = ttk.Frame(tab)
        interp_frame.pack(fill=tk.X, pady=5)
        ttk.Label(interp_frame, text="插值算法:").pack(side=tk.LEFT)
        self.interpolation_var = tk.StringVar(value="双三次 (Bicubic)")
        interp_combo = ttk.Combobox(interp_frame, textvariable=self.interpolation_var, values=list(INTERPOLATION_METHODS.keys()), state="readonly", width=15)
        interp_combo.pack(side=tk.LEFT, padx=5, fill=tk.X, expand=True)

        btn_frame = ttk.Frame(tab)
        btn_frame.pack(fill=tk.X, pady=15)
        ttk.Button(btn_frame, text="预览效果", command=self.preview_resize).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="添加到任务队列", command=self.add_resize_task).pack(side=tk.LEFT, padx=5)

        self.update_resize_mode()

    def setup_convert_tab(self, notebook):
        tab = ttk.Frame(notebook, padding=10)
        notebook.add(tab, text="格式转换")

        ttk.Label(tab, text="输出格式:").pack(anchor=tk.W, pady=5)
        self.convert_format = tk.StringVar(value="JPEG")
        format_combo = ttk.Combobox(tab, textvariable=self.convert_format, values=list(FORMAT_EXTENSIONS.keys()), state="readonly")
        format_combo.pack(fill=tk.X, pady=5)

        ttk.Label(tab, text="压缩质量:").pack(anchor=tk.W, pady=5)
        self.convert_quality = tk.IntVar(value=85)
        quality_scale = ttk.Scale(tab, from_=1, to=100, variable=self.convert_quality, orient=tk.HORIZONTAL)
        quality_scale.pack(fill=tk.X, pady=2)
        self.quality_label = ttk.Label(tab, text="85%")
        self.quality_label.pack(anchor=tk.W)
        self.convert_quality.trace_add('write', lambda *args: self.quality_label.config(text=f"{self.convert_quality.get()}%"))

        btn_frame = ttk.Frame(tab)
        btn_frame.pack(fill=tk.X, pady=15)
        ttk.Button(btn_frame, text="预览效果", command=self.preview_convert).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="添加到任务队列", command=self.add_convert_task).pack(side=tk.LEFT, padx=5)

    def setup_filter_tab(self, notebook):
        tab = ttk.Frame(notebook, padding=10)
        notebook.add(tab, text="滤镜效果")

        ttk.Label(tab, text="选择滤镜:").pack(anchor=tk.W, pady=5)
        self.filter_name = tk.StringVar(value="原图")
        filter_combo = ttk.Combobox(tab, textvariable=self.filter_name, values=FILTER_NAMES, state="readonly")
        filter_combo.pack(fill=tk.X, pady=5)

        self.filter_params_frame = ttk.Frame(tab)
        self.filter_params_frame.pack(fill=tk.X, pady=5)

        self.filter_name.trace_add('write', lambda *args: self.update_filter_params())

        btn_frame = ttk.Frame(tab)
        btn_frame.pack(fill=tk.X, pady=15)
        ttk.Button(btn_frame, text="预览效果", command=self.preview_filter).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="添加到任务队列", command=self.add_filter_task).pack(side=tk.LEFT, padx=5)

        self.update_filter_params()

    def update_filter_params(self):
        for w in self.filter_params_frame.winfo_children():
            w.destroy()

        f = self.filter_name.get()
        if f == '黑白阈值':
            ttk.Label(self.filter_params_frame, text="阈值:").pack(anchor=tk.W)
            self.filter_threshold = tk.IntVar(value=128)
            ttk.Scale(self.filter_params_frame, from_=0, to=255, variable=self.filter_threshold, orient=tk.HORIZONTAL).pack(fill=tk.X)
        elif f == '马赛克':
            ttk.Label(self.filter_params_frame, text="马赛克强度:").pack(anchor=tk.W)
            self.filter_mosaic = tk.IntVar(value=10)
            ttk.Scale(self.filter_params_frame, from_=2, to=30, variable=self.filter_mosaic, orient=tk.HORIZONTAL).pack(fill=tk.X)
        elif f == '高斯模糊':
            ttk.Label(self.filter_params_frame, text="模糊半径:").pack(anchor=tk.W)
            self.filter_blur = tk.IntVar(value=5)
            ttk.Scale(self.filter_params_frame, from_=1, to=20, variable=self.filter_blur, orient=tk.HORIZONTAL).pack(fill=tk.X)

    def setup_watermark_tab(self, notebook):
        tab = ttk.Frame(notebook, padding=10)
        notebook.add(tab, text="添加水印")

        self.watermark_type_frame = ttk.Frame(tab)
        self.watermark_type_frame.pack(fill=tk.X, pady=5)
        self.watermark_type = tk.StringVar(value="text")
        ttk.Radiobutton(self.watermark_type_frame, text="文字水印", variable=self.watermark_type, value="text", command=self.update_watermark_type).pack(side=tk.LEFT, padx=5)
        ttk.Radiobutton(self.watermark_type_frame, text="图片水印", variable=self.watermark_type, value="image", command=self.update_watermark_type).pack(side=tk.LEFT, padx=5)

        self.text_frame = ttk.Frame(tab)
        self.text_frame.pack(fill=tk.X, pady=5)
        ttk.Label(self.text_frame, text="水印文字:").grid(row=0, column=0, sticky=tk.W, pady=2)
        self.wm_text = tk.StringVar(value="水印")
        ttk.Entry(self.text_frame, textvariable=self.wm_text).grid(row=0, column=1, sticky=tk.EW, pady=2, padx=5)
        self.text_frame.columnconfigure(1, weight=1)

        ttk.Label(self.text_frame, text="字体大小:").grid(row=1, column=0, sticky=tk.W, pady=2)
        self.wm_font_size = tk.IntVar(value=36)
        ttk.Entry(self.text_frame, textvariable=self.wm_font_size, width=10).grid(row=1, column=1, sticky=tk.W, pady=2, padx=5)

        ttk.Label(self.text_frame, text="字体颜色:").grid(row=2, column=0, sticky=tk.W, pady=2)
        self.wm_color = (255, 255, 255)
        self.wm_color_btn = tk.Button(self.text_frame, text="    ", bg="white", command=self.choose_wm_color, width=5)
        self.wm_color_btn.grid(row=2, column=1, sticky=tk.W, pady=2, padx=5)

        self.image_frame = ttk.Frame(tab)
        self.image_frame.pack(fill=tk.X, pady=5)
        ttk.Label(self.image_frame, text="水印图片:").pack(anchor=tk.W)
        wm_path_frame = ttk.Frame(self.image_frame)
        wm_path_frame.pack(fill=tk.X, pady=2)
        self.wm_image_path = tk.StringVar()
        ttk.Entry(wm_path_frame, textvariable=self.wm_image_path).pack(side=tk.LEFT, fill=tk.X, expand=True)
        ttk.Button(wm_path_frame, text="...", width=3, command=self.choose_wm_image).pack(side=tk.RIGHT)

        pos_frame = ttk.LabelFrame(tab, text="位置", padding=5)
        pos_frame.pack(fill=tk.X, pady=5)
        self.wm_position = tk.StringVar(value="右下")
        pos_combo = ttk.Combobox(pos_frame, textvariable=self.wm_position, values=WATERMARK_POSITIONS, state="readonly")
        pos_combo.pack(fill=tk.X)

        param_frame = ttk.LabelFrame(tab, text="参数", padding=5)
        param_frame.pack(fill=tk.X, pady=5)

        ttk.Label(param_frame, text="透明度:").grid(row=0, column=0, sticky=tk.W, pady=2)
        self.wm_opacity = tk.DoubleVar(value=0.5)
        ttk.Scale(param_frame, from_=0, to=1, variable=self.wm_opacity, orient=tk.HORIZONTAL).grid(row=0, column=1, sticky=tk.EW, pady=2, padx=5)

        ttk.Label(param_frame, text="旋转角度:").grid(row=1, column=0, sticky=tk.W, pady=2)
        self.wm_rotation = tk.IntVar(value=0)
        ttk.Scale(param_frame, from_=-180, to=180, variable=self.wm_rotation, orient=tk.HORIZONTAL).grid(row=1, column=1, sticky=tk.EW, pady=2, padx=5)

        ttk.Label(param_frame, text="缩放比例:").grid(row=2, column=0, sticky=tk.W, pady=2)
        self.wm_scale = tk.DoubleVar(value=0.2)
        ttk.Scale(param_frame, from_=0.01, to=1, variable=self.wm_scale, orient=tk.HORIZONTAL).grid(row=2, column=1, sticky=tk.EW, pady=2, padx=5)

        param_frame.columnconfigure(1, weight=1)

        btn_frame = ttk.Frame(tab)
        btn_frame.pack(fill=tk.X, pady=15)
        ttk.Button(btn_frame, text="预览效果", command=self.preview_watermark).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="添加到任务队列", command=self.add_watermark_task).pack(side=tk.LEFT, padx=5)

        self.update_watermark_type()

    def setup_rename_tab(self, notebook):
        tab = ttk.Frame(notebook, padding=10)
        notebook.add(tab, text="批量重命名")

        ttk.Label(tab, text="命名模式:").pack(anchor=tk.W, pady=5)
        self.rename_mode = tk.StringVar(value="序号+前缀")
        mode_combo = ttk.Combobox(tab, textvariable=self.rename_mode, values=RENAME_MODES, state="readonly")
        mode_combo.pack(fill=tk.X, pady=5)
        mode_combo.bind('<<ComboboxSelected>>', lambda e: self.update_rename_params())

        self.rename_params_frame = ttk.Frame(tab)
        self.rename_params_frame.pack(fill=tk.X, pady=5)

        ttk.Button(tab, text="预览重命名", command=self.preview_rename).pack(anchor=tk.W, pady=5)

        self.rename_preview_list = tk.Listbox(tab, height=8)
        self.rename_preview_list.pack(fill=tk.BOTH, expand=True, pady=5)

        btn_frame = ttk.Frame(tab)
        btn_frame.pack(fill=tk.X, pady=15)
        ttk.Button(btn_frame, text="添加到任务队列", command=self.add_rename_task).pack(side=tk.LEFT, padx=5)

        self.update_rename_params()

    def update_rename_params(self):
        for w in self.rename_params_frame.winfo_children():
            w.destroy()

        mode = self.rename_mode.get()
        if mode == '序号+前缀':
            ttk.Label(self.rename_params_frame, text="前缀:").grid(row=0, column=0, sticky=tk.W, pady=2)
            self.rename_prefix = tk.StringVar(value="image")
            ttk.Entry(self.rename_params_frame, textvariable=self.rename_prefix).grid(row=0, column=1, sticky=tk.EW, pady=2, padx=5)
            ttk.Label(self.rename_params_frame, text="起始序号:").grid(row=1, column=0, sticky=tk.W, pady=2)
            self.rename_start = tk.IntVar(value=1)
            ttk.Entry(self.rename_params_frame, textvariable=self.rename_start, width=10).grid(row=1, column=1, sticky=tk.W, pady=2, padx=5)
            self.rename_params_frame.columnconfigure(1, weight=1)
        elif mode == '拍摄日期':
            ttk.Label(self.rename_params_frame, text="日期格式:").grid(row=0, column=0, sticky=tk.W, pady=2)
            self.rename_date_format = tk.StringVar(value="%Y%m%d_%H%M%S")
            ttk.Entry(self.rename_params_frame, textvariable=self.rename_date_format).grid(row=0, column=1, sticky=tk.EW, pady=2, padx=5)
            self.rename_params_frame.columnconfigure(1, weight=1)
        elif mode == '正则表达式替换':
            ttk.Label(self.rename_params_frame, text="正则模式:").grid(row=0, column=0, sticky=tk.W, pady=2)
            self.rename_regex_pattern = tk.StringVar()
            ttk.Entry(self.rename_params_frame, textvariable=self.rename_regex_pattern).grid(row=0, column=1, sticky=tk.EW, pady=2, padx=5)
            ttk.Label(self.rename_params_frame, text="替换为:").grid(row=1, column=0, sticky=tk.W, pady=2)
            self.rename_regex_replace = tk.StringVar()
            ttk.Entry(self.rename_params_frame, textvariable=self.rename_regex_replace).grid(row=1, column=1, sticky=tk.EW, pady=2, padx=5)
            self.rename_params_frame.columnconfigure(1, weight=1)

    def setup_crop_tab(self, notebook):
        tab = ttk.Frame(notebook, padding=10)
        notebook.add(tab, text="自动裁剪")

        ttk.Label(tab, text="裁剪模式:").pack(anchor=tk.W, pady=5)
        self.crop_mode = tk.StringVar(value="固定尺寸")
        mode_combo = ttk.Combobox(tab, textvariable=self.crop_mode, values=CROP_MODES, state="readonly")
        mode_combo.pack(fill=tk.X, pady=5)
        mode_combo.bind('<<ComboboxSelected>>', lambda e: self.update_crop_params())

        self.crop_params_frame = ttk.Frame(tab)
        self.crop_params_frame.pack(fill=tk.X, pady=5)

        btn_frame = ttk.Frame(tab)
        btn_frame.pack(fill=tk.X, pady=15)
        ttk.Button(btn_frame, text="预览效果", command=self.preview_crop).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="添加到任务队列", command=self.add_crop_task).pack(side=tk.LEFT, padx=5)

        self.update_crop_params()

    def update_crop_params(self):
        for w in self.crop_params_frame.winfo_children():
            w.destroy()

        mode = self.crop_mode.get()
        if mode == '固定尺寸':
            ttk.Label(self.crop_params_frame, text="宽度:").grid(row=0, column=0, sticky=tk.W, pady=2)
            self.crop_width = tk.IntVar(value=1080)
            ttk.Entry(self.crop_params_frame, textvariable=self.crop_width, width=10).grid(row=0, column=1, pady=2, padx=5)
            ttk.Label(self.crop_params_frame, text="px").grid(row=0, column=2, sticky=tk.W)
            ttk.Label(self.crop_params_frame, text="高度:").grid(row=1, column=0, sticky=tk.W, pady=2)
            self.crop_height = tk.IntVar(value=1080)
            ttk.Entry(self.crop_params_frame, textvariable=self.crop_height, width=10).grid(row=1, column=1, pady=2, padx=5)
            ttk.Label(self.crop_params_frame, text="px").grid(row=1, column=2, sticky=tk.W)
        elif mode == '指定区域比例':
            ttk.Label(self.crop_params_frame, text="X起始:").grid(row=0, column=0, sticky=tk.W, pady=2)
            self.crop_x_ratio = tk.DoubleVar(value=0.1)
            ttk.Scale(self.crop_params_frame, from_=0, to=0.9, variable=self.crop_x_ratio, orient=tk.HORIZONTAL).grid(row=0, column=1, sticky=tk.EW, pady=2, padx=5)
            ttk.Label(self.crop_params_frame, text="Y起始:").grid(row=1, column=0, sticky=tk.W, pady=2)
            self.crop_y_ratio = tk.DoubleVar(value=0.1)
            ttk.Scale(self.crop_params_frame, from_=0, to=0.9, variable=self.crop_y_ratio, orient=tk.HORIZONTAL).grid(row=1, column=1, sticky=tk.EW, pady=2, padx=5)
            ttk.Label(self.crop_params_frame, text="宽度:").grid(row=2, column=0, sticky=tk.W, pady=2)
            self.crop_w_ratio = tk.DoubleVar(value=0.8)
            ttk.Scale(self.crop_params_frame, from_=0.1, to=1, variable=self.crop_w_ratio, orient=tk.HORIZONTAL).grid(row=2, column=1, sticky=tk.EW, pady=2, padx=5)
            ttk.Label(self.crop_params_frame, text="高度:").grid(row=3, column=0, sticky=tk.W, pady=2)
            self.crop_h_ratio = tk.DoubleVar(value=0.8)
            ttk.Scale(self.crop_params_frame, from_=0.1, to=1, variable=self.crop_h_ratio, orient=tk.HORIZONTAL).grid(row=3, column=1, sticky=tk.EW, pady=2, padx=5)
            self.crop_params_frame.columnconfigure(1, weight=1)
        elif mode == '智能裁剪空白边缘':
            ttk.Label(self.crop_params_frame, text="边缘阈值:").grid(row=0, column=0, sticky=tk.W, pady=2)
            self.crop_edge_threshold = tk.IntVar(value=10)
            ttk.Scale(self.crop_params_frame, from_=1, to=50, variable=self.crop_edge_threshold, orient=tk.HORIZONTAL).grid(row=0, column=1, sticky=tk.EW, pady=2, padx=5)
            self.crop_params_frame.columnconfigure(1, weight=1)

    def setup_rotate_tab(self, notebook):
        tab = ttk.Frame(notebook, padding=10)
        notebook.add(tab, text="旋转翻转")

        ttk.Label(tab, text="操作:").pack(anchor=tk.W, pady=5)
        self.rotate_operation = tk.StringVar(value="不旋转")
        op_combo = ttk.Combobox(tab, textvariable=self.rotate_operation, values=ROTATE_OPTIONS, state="readonly")
        op_combo.pack(fill=tk.X, pady=5)
        op_combo.bind('<<ComboboxSelected>>', lambda e: self.update_rotate_params())

        self.rotate_params_frame = ttk.Frame(tab)
        self.rotate_params_frame.pack(fill=tk.X, pady=5)

        btn_frame = ttk.Frame(tab)
        btn_frame.pack(fill=tk.X, pady=15)
        ttk.Button(btn_frame, text="预览效果", command=self.preview_rotate).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="添加到任务队列", command=self.add_rotate_task).pack(side=tk.LEFT, padx=5)

        self.update_rotate_params()

    def update_rotate_params(self):
        for w in self.rotate_params_frame.winfo_children():
            w.destroy()

        op = self.rotate_operation.get()
        if op == '自定义角度':
            ttk.Label(self.rotate_params_frame, text="旋转角度:").grid(row=0, column=0, sticky=tk.W, pady=2)
            self.rotate_angle = tk.IntVar(value=45)
            ttk.Scale(self.rotate_params_frame, from_=-180, to=180, variable=self.rotate_angle, orient=tk.HORIZONTAL).grid(row=0, column=1, sticky=tk.EW, pady=2, padx=5)
            ttk.Label(self.rotate_params_frame, text="背景颜色:").grid(row=1, column=0, sticky=tk.W, pady=2)
            self.rotate_bg_color = (255, 255, 255)
            self.rotate_color_btn = tk.Button(self.rotate_params_frame, text="    ", bg="white", command=self.choose_rotate_color, width=5)
            self.rotate_color_btn.grid(row=1, column=1, sticky=tk.W, pady=2, padx=5)
            self.rotate_params_frame.columnconfigure(1, weight=1)

    def setup_colors_tab(self, notebook):
        tab = ttk.Frame(notebook, padding=10)
        notebook.add(tab, text="颜色调整")

        params = [
            ("亮度", "brightness", 0.5, 2.0, 1.0),
            ("对比度", "contrast", 0.5, 2.0, 1.0),
            ("饱和度", "saturation", 0.0, 2.0, 1.0),
            ("色相", "hue", -1.0, 1.0, 0.0),
            ("锐度", "sharpness", 0.0, 2.0, 1.0),
        ]

        self.color_vars = {}
        self._color_preview_pending = False
        for i, (name, key, min_v, max_v, default) in enumerate(params):
            frame = ttk.Frame(tab)
            frame.pack(fill=tk.X, pady=3)
            ttk.Label(frame, text=f"{name}:", width=8).pack(side=tk.LEFT)
            var = tk.DoubleVar(value=default)
            self.color_vars[key] = var
            scale = ttk.Scale(frame, from_=min_v, to=max_v, variable=var, orient=tk.HORIZONTAL)
            scale.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=5)
            label = ttk.Label(frame, text=f"{default:.2f}", width=6)
            label.pack(side=tk.LEFT)
            var.trace_add('write', lambda *args, k=key, l=label: self._on_color_change(k, l))

        ttk.Button(tab, text="重置参数", command=self.reset_colors).pack(anchor=tk.W, pady=5)

        btn_frame = ttk.Frame(tab)
        btn_frame.pack(fill=tk.X, pady=15)
        ttk.Button(btn_frame, text="实时预览", command=self.preview_colors).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="添加到任务队列", command=self.add_colors_task).pack(side=tk.LEFT, padx=5)

    def setup_beautify_tab(self, notebook):
        tab = ttk.Frame(notebook, padding=10)
        notebook.add(tab, text="人像美化")

        ttk.Label(tab, text="磨皮强度:").pack(anchor=tk.W, pady=5)
        self.beautify_smooth = tk.IntVar(value=5)
        ttk.Scale(tab, from_=0, to=10, variable=self.beautify_smooth, orient=tk.HORIZONTAL).pack(fill=tk.X, pady=2)

        self.beautify_red_eye = tk.BooleanVar(value=True)
        ttk.Checkbutton(tab, text="去除红眼", variable=self.beautify_red_eye).pack(anchor=tk.W, pady=5)

        btn_frame = ttk.Frame(tab)
        btn_frame.pack(fill=tk.X, pady=15)
        ttk.Button(btn_frame, text="预览效果", command=self.preview_beautify).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="添加到任务队列", command=self.add_beautify_task).pack(side=tk.LEFT, padx=5)

        tip = ttk.Label(tab, text="说明: 自动识别人脸进行磨皮处理，\n可检测并去除红眼。", foreground="#666")
        tip.pack(anchor=tk.W, pady=10)

    def setup_queue_tab(self, notebook):
        tab = ttk.Frame(notebook, padding=10)
        notebook.add(tab, text="任务队列")

        btn_frame = ttk.Frame(tab)
        btn_frame.pack(fill=tk.X, pady=(0, 5))
        ttk.Button(btn_frame, text="上移", command=self.move_task_up).pack(side=tk.LEFT, padx=2)
        ttk.Button(btn_frame, text="下移", command=self.move_task_down).pack(side=tk.LEFT, padx=2)
        ttk.Button(btn_frame, text="删除", command=self.remove_task).pack(side=tk.LEFT, padx=2)
        ttk.Button(btn_frame, text="清空", command=self.clear_tasks).pack(side=tk.LEFT, padx=2)
        ttk.Button(btn_frame, text="保存模板", command=self.save_template).pack(side=tk.RIGHT, padx=2)

        self.queue_listbox = tk.Listbox(tab, height=12)
        self.queue_listbox.pack(fill=tk.BOTH, expand=True, pady=5)

        start_frame = ttk.Frame(tab)
        start_frame.pack(fill=tk.X, pady=10)
        ttk.Button(start_frame, text="开始批量处理", command=self.start_batch, style="Accent.TButton").pack(side=tk.LEFT, padx=5)
        ttk.Button(start_frame, text="暂停", command=self.pause_batch).pack(side=tk.LEFT, padx=5)
        ttk.Button(start_frame, text="继续", command=self.resume_batch).pack(side=tk.LEFT, padx=5)
        ttk.Button(start_frame, text="取消", command=self.cancel_batch).pack(side=tk.LEFT, padx=5)

    def setup_history_tab(self, notebook):
        tab = ttk.Frame(notebook, padding=10)
        notebook.add(tab, text="历史记录")

        btn_frame = ttk.Frame(tab)
        btn_frame.pack(fill=tk.X, pady=(0, 5))
        ttk.Button(btn_frame, text="应用模板", command=self.apply_history_template).pack(side=tk.LEFT, padx=2)
        ttk.Button(btn_frame, text="删除", command=self.delete_history).pack(side=tk.LEFT, padx=2)
        ttk.Button(btn_frame, text="清空", command=self.clear_history).pack(side=tk.LEFT, padx=2)
        ttk.Button(btn_frame, text="重命名", command=self.rename_history).pack(side=tk.RIGHT, padx=2)

        self.history_listbox = tk.Listbox(tab, height=15)
        self.history_listbox.pack(fill=tk.BOTH, expand=True, pady=5)
        self.history_listbox.bind('<Double-1>', lambda e: self.apply_history_template())

        self.refresh_history_list()

    def setup_progress_panel(self, parent):
        progress_frame = ttk.LabelFrame(parent, text="处理进度", padding=5)
        progress_frame.pack(fill=tk.X)

        self.progress_bar = ttk.Progressbar(progress_frame, mode='determinate')
        self.progress_bar.pack(fill=tk.X, pady=2)

        self.progress_label = ttk.Label(progress_frame, text="就绪")
        self.progress_label.pack(anchor=tk.W)

        log_frame = ttk.LabelFrame(parent, text="处理日志", padding=5)
        log_frame.pack(fill=tk.X, pady=5)
        self.log_text = tk.Text(log_frame, height=6)
        log_scroll = ttk.Scrollbar(log_frame, orient=tk.VERTICAL, command=self.log_text.yview)
        self.log_text.configure(yscrollcommand=log_scroll.set)
        self.log_text.pack(side=tk.LEFT, fill=tk.X, expand=True)
        log_scroll.pack(side=tk.RIGHT, fill=tk.Y)

    def setup_callbacks(self):
        self.batch_processor.progress_callback = self.on_progress_update
        self.batch_processor.complete_callback = self.on_process_complete
        self.batch_processor.log_callback = self.on_log_message

    def add_files(self):
        files = filedialog.askopenfilenames(
            title="选择图片文件",
            filetypes=[("图片文件", "*.jpg *.jpeg *.png *.bmp *.webp"), ("所有文件", "*.*")]
        )
        if files:
            self.batch_processor.add_files(list(files))
            self.refresh_file_list()

    def add_folder(self):
        folder = filedialog.askdirectory(title="选择图片文件夹")
        if folder:
            self.batch_processor.add_folder(folder)
            self.refresh_file_list()

    def remove_file(self):
        selection = self.file_listbox.curselection()
        for i in reversed(selection):
            self.batch_processor.remove_file(i)
        self.refresh_file_list()

    def clear_files(self):
        self.batch_processor.clear_files()
        self.refresh_file_list()

    def choose_output_dir(self):
        folder = filedialog.askdirectory(title="选择输出目录")
        if folder:
            self.output_dir_var.set(folder)
            self.batch_processor.set_output_dir(folder)

    def refresh_file_list(self):
        self.file_listbox.delete(0, tk.END)
        for f in self.batch_processor.get_files():
            self.file_listbox.insert(tk.END, os.path.basename(f))

    def on_file_select(self, event):
        selection = self.file_listbox.curselection()
        if selection:
            idx = selection[0]
            files = self.batch_processor.get_files()
            if idx < len(files):
                self.load_preview(files[idx])

    def load_preview(self, filepath):
        if not os.path.exists(filepath):
            return

        try:
            self.preview_file = filepath
            self.processor.load_image(filepath)
            self.show_original()

            info = self.processor.get_image_info()
            self.info_label.config(text=f"尺寸: {info.get('size', '-')} | 格式: {info.get('format', '-')}")
        except Exception as e:
            messagebox.showerror("错误", f"无法加载图片: {str(e)}")

    def show_original(self):
        if self.processor.original_image is None:
            return

        img = self.processor.original_image.copy()
        self._display_image(img, self.original_canvas, 'original')
        self._display_image(img, self.preview_canvas, 'processed')
        self.processor.reset()

    def reset_preview(self):
        if self.preview_file:
            self.load_preview(self.preview_file)

    def _display_image(self, pil_image, canvas, which):
        canvas.update_idletasks()
        canvas_w = max(canvas.winfo_width(), 200)
        canvas_h = max(canvas.winfo_height(), 200)

        img = pil_image.copy()
        img_w, img_h = img.size
        ratio = min(canvas_w / img_w, canvas_h / img_h, 1.0)
        new_w, new_h = int(img_w * ratio), int(img_h * ratio)

        if new_w > 0 and new_h > 0:
            img = img.resize((new_w, new_h), Image.LANCZOS)

        tk_img = ImageTk.PhotoImage(img)
        canvas.delete("all")
        x = (canvas_w - new_w) // 2
        y = (canvas_h - new_h) // 2
        canvas.create_image(x, y, anchor=tk.NW, image=tk_img)

        if which == 'original':
            self.original_preview_tk = tk_img
        else:
            self.preview_image_tk = tk_img

    def update_resize_mode(self):
        if self.resize_mode.get() == 'pixel':
            self.pixel_frame.pack(fill=tk.X, pady=5, before=self.keep_aspect_checkbox)
            self.percent_frame.pack_forget()
        else:
            self.pixel_frame.pack_forget()
            self.percent_frame.pack(fill=tk.X, pady=5, before=self.keep_aspect_checkbox)

    def update_watermark_type(self):
        if self.watermark_type.get() == 'text':
            self.text_frame.pack(fill=tk.X, pady=5, after=self.watermark_type_frame)
            self.image_frame.pack_forget()
        else:
            self.text_frame.pack_forget()
            self.image_frame.pack(fill=tk.X, pady=5, after=self.watermark_type_frame)

    def choose_wm_color(self):
        color = colorchooser.askcolor(initialcolor=self.wm_color)
        if color[0]:
            self.wm_color = tuple(int(c) for c in color[0])
            hex_color = f"#{self.wm_color[0]:02x}{self.wm_color[1]:02x}{self.wm_color[2]:02x}"
            self.wm_color_btn.config(bg=hex_color)

    def choose_wm_image(self):
        file = filedialog.askopenfilename(filetypes=[("图片文件", "*.png *.jpg *.jpeg *.gif *.bmp")])
        if file:
            self.wm_image_path.set(file)

    def choose_rotate_color(self):
        color = colorchooser.askcolor(initialcolor=self.rotate_bg_color)
        if color[0]:
            self.rotate_bg_color = tuple(int(c) for c in color[0])
            hex_color = f"#{self.rotate_bg_color[0]:02x}{self.rotate_bg_color[1]:02x}{self.rotate_bg_color[2]:02x}"
            self.rotate_color_btn.config(bg=hex_color)

    def _on_color_change(self, key, label):
        label.config(text=f"{self.color_vars[key].get():.2f}")
        if self.processor.current_image is not None and self.preview_file is not None:
            if not self._color_preview_pending:
                self._color_preview_pending = True
                self.root.after(50, self._delayed_color_preview)

    def _delayed_color_preview(self):
        self._color_preview_pending = False
        if self.processor.current_image is not None:
            self.preview_colors()

    def reset_colors(self):
        self.color_vars['brightness'].set(1.0)
        self.color_vars['contrast'].set(1.0)
        self.color_vars['saturation'].set(1.0)
        self.color_vars['hue'].set(0.0)
        self.color_vars['sharpness'].set(1.0)

    def preview_resize(self):
        if not self._check_preview_image():
            return

        self.processor.reset()
        params = self._get_resize_params()
        self.processor.resize(**params)
        self._update_processed_preview()

    def preview_convert(self):
        if not self._check_preview_image():
            return

        self.processor.reset()
        self.processor.convert_format(self.convert_format.get(), self.convert_quality.get())
        self._update_processed_preview()

    def preview_filter(self):
        if not self._check_preview_image():
            return

        self.processor.reset()
        params = self._get_filter_params()
        if params['filter_name'] != '原图':
            self.processor.apply_filter(**params)
        self._update_processed_preview()

    def preview_watermark(self):
        if not self._check_preview_image():
            return

        self.processor.reset()
        params = self._get_watermark_params()
        self.processor.add_watermark(**params)
        self._update_processed_preview()

    def preview_crop(self):
        if not self._check_preview_image():
            return

        self.processor.reset()
        params = self._get_crop_params()
        self.processor.crop_image(**params)
        self._update_processed_preview()

    def preview_rotate(self):
        if not self._check_preview_image():
            return

        self.processor.reset()
        params = self._get_rotate_params()
        self.processor.rotate_flip(**params)
        self._update_processed_preview()

    def preview_colors(self):
        if not self._check_preview_image():
            return

        self.processor.reset()
        params = self._get_colors_params()
        self.processor.adjust_colors(**params)
        self._update_processed_preview()

    def preview_beautify(self):
        if not self._check_preview_image():
            return

        self.processor.reset()
        params = self._get_beautify_params()
        self.processor.portrait_beautify(**params)
        self._update_processed_preview()

    def apply_preview(self):
        self.preview_resize()

    def add_current_to_queue(self):
        pass

    def _check_preview_image(self):
        if self.processor.current_image is None:
            messagebox.showwarning("提示", "请先选择一张图片进行预览")
            return False
        return True

    def _update_processed_preview(self):
        self._display_image(self.processor.current_image, self.preview_canvas, 'processed')

    def _get_resize_params(self):
        if self.resize_mode.get() == 'percent':
            return {
                'percent': self.resize_percent.get(),
                'keep_aspect': True,
                'interpolation': INTERPOLATION_METHODS[self.interpolation_var.get()]
            }
        else:
            return {
                'width': self.resize_width.get(),
                'height': self.resize_height.get(),
                'keep_aspect': self.keep_aspect.get() and not self.force_stretch.get(),
                'interpolation': INTERPOLATION_METHODS[self.interpolation_var.get()]
            }

    def _get_filter_params(self):
        name = self.filter_name.get()
        params = {'filter_name': name}
        if name == '黑白阈值':
            params['threshold'] = self.filter_threshold.get()
        elif name == '马赛克':
            params['mosaic_scale'] = self.filter_mosaic.get()
        elif name == '高斯模糊':
            params['blur_radius'] = self.filter_blur.get()
        return params

    def _get_watermark_params(self):
        wm_type = self.watermark_type.get()
        params = {
            'watermark_type': wm_type,
            'position': self.wm_position.get(),
            'opacity': self.wm_opacity.get(),
            'rotation': self.wm_rotation.get(),
            'scale': self.wm_scale.get()
        }
        if wm_type == 'text':
            params.update({
                'text': self.wm_text.get(),
                'font_size': self.wm_font_size.get(),
                'font_color': self.wm_color
            })
        else:
            params['watermark_path'] = self.wm_image_path.get()
        return params

    def _get_rename_params(self):
        mode = self.rename_mode.get()
        params = {'rename_mode': mode}
        if mode == '序号+前缀':
            params.update({
                'prefix': self.rename_prefix.get(),
                'start_index': self.rename_start.get()
            })
        elif mode == '拍摄日期':
            params['date_format'] = self.rename_date_format.get()
        elif mode == '正则表达式替换':
            params.update({
                'regex_pattern': self.rename_regex_pattern.get(),
                'regex_replace': self.rename_regex_replace.get()
            })
        return params

    def _get_crop_params(self):
        mode = self.crop_mode.get()
        params = {'mode': mode}
        if mode == '固定尺寸':
            params.update({
                'crop_width': self.crop_width.get(),
                'crop_height': self.crop_height.get()
            })
        elif mode == '指定区域比例':
            params.update({
                'x_ratio': self.crop_x_ratio.get(),
                'y_ratio': self.crop_y_ratio.get(),
                'w_ratio': self.crop_w_ratio.get(),
                'h_ratio': self.crop_h_ratio.get()
            })
        elif mode == '智能裁剪空白边缘':
            params['edge_threshold'] = self.crop_edge_threshold.get()
        return params

    def _get_rotate_params(self):
        op = self.rotate_operation.get()
        params = {'operation': op}
        if op == '自定义角度':
            params.update({
                'angle': self.rotate_angle.get(),
                'bg_color': self.rotate_bg_color
            })
        return params

    def _get_colors_params(self):
        return {
            'brightness': self.color_vars['brightness'].get(),
            'contrast': self.color_vars['contrast'].get(),
            'saturation': self.color_vars['saturation'].get(),
            'hue': self.color_vars['hue'].get(),
            'sharpness': self.color_vars['sharpness'].get()
        }

    def _get_beautify_params(self):
        return {
            'smooth_strength': self.beautify_smooth.get(),
            'remove_red_eye': self.beautify_red_eye.get()
        }

    def add_resize_task(self):
        task = ProcessingTask('resize', self._get_resize_params())
        self.batch_processor.add_task(task)
        self.refresh_queue_list()

    def add_convert_task(self):
        task = ProcessingTask('convert', {
            'output_format': self.convert_format.get(),
            'quality': self.convert_quality.get()
        })
        self.batch_processor.add_task(task)
        self.refresh_queue_list()

    def add_filter_task(self):
        params = self._get_filter_params()
        if params['filter_name'] == '原图':
            messagebox.showinfo("提示", "请选择一个滤镜效果")
            return
        task = ProcessingTask('filter', params)
        self.batch_processor.add_task(task)
        self.refresh_queue_list()

    def add_watermark_task(self):
        params = self._get_watermark_params()
        if params['watermark_type'] == 'image' and not params['watermark_path']:
            messagebox.showwarning("提示", "请选择水印图片")
            return
        task = ProcessingTask('watermark', params)
        self.batch_processor.add_task(task)
        self.refresh_queue_list()

    def add_rename_task(self):
        task = ProcessingTask('rename', self._get_rename_params())
        self.batch_processor.add_task(task)
        self.refresh_queue_list()

    def add_crop_task(self):
        task = ProcessingTask('crop', self._get_crop_params())
        self.batch_processor.add_task(task)
        self.refresh_queue_list()

    def add_rotate_task(self):
        params = self._get_rotate_params()
        if params['operation'] == '不旋转':
            messagebox.showinfo("提示", "请选择一个旋转/翻转操作")
            return
        task = ProcessingTask('rotate', params)
        self.batch_processor.add_task(task)
        self.refresh_queue_list()

    def add_colors_task(self):
        task = ProcessingTask('colors', self._get_colors_params())
        self.batch_processor.add_task(task)
        self.refresh_queue_list()

    def add_beautify_task(self):
        task = ProcessingTask('beautify', self._get_beautify_params())
        self.batch_processor.add_task(task)
        self.refresh_queue_list()

    def preview_rename(self):
        files = self.batch_processor.get_files()
        if not files:
            messagebox.showwarning("提示", "请先添加图片文件")
            return

        params = self._get_rename_params()
        renamed = batch_rename(files, **params)

        self.rename_preview_list.delete(0, tk.END)
        for old, new in renamed:
            self.rename_preview_list.insert(tk.END, f"{os.path.basename(old)} -> {os.path.basename(new)}")

    def refresh_queue_list(self):
        self.queue_listbox.delete(0, tk.END)
        for i, task in enumerate(self.batch_processor.get_tasks()):
            self.queue_listbox.insert(tk.END, f"{i+1}. {task.get_description()}")

    def move_task_up(self):
        idx = self.queue_listbox.curselection()
        if idx:
            self.batch_processor.move_task(idx[0], -1)
            self.refresh_queue_list()
            self.queue_listbox.selection_set(max(0, idx[0]-1))

    def move_task_down(self):
        idx = self.queue_listbox.curselection()
        if idx:
            self.batch_processor.move_task(idx[0], 1)
            self.refresh_queue_list()
            self.queue_listbox.selection_set(min(len(self.batch_processor.get_tasks())-1, idx[0]+1))

    def remove_task(self):
        idx = self.queue_listbox.curselection()
        if idx:
            self.batch_processor.remove_task(idx[0])
            self.refresh_queue_list()

    def clear_tasks(self):
        self.batch_processor.clear_tasks()
        self.refresh_queue_list()

    def save_template(self):
        tasks = self.batch_processor.get_tasks()
        if not tasks:
            messagebox.showwarning("提示", "任务队列为空")
            return

        name = tk.simpledialog.askstring("保存模板", "请输入模板名称:")
        if name:
            self.history_manager.add_record(name, tasks)
            self.refresh_history_list()
            messagebox.showinfo("成功", "模板已保存到历史记录")

    def start_batch(self):
        files = self.batch_processor.get_files()
        tasks = self.batch_processor.get_tasks()

        if not files:
            messagebox.showwarning("提示", "请先添加图片文件")
            return
        if not tasks:
            messagebox.showwarning("提示", "请先添加处理任务")
            return

        self.batch_processor.set_output_dir(self.output_dir_var.get())
        self.log_text.delete(1.0, tk.END)
        self.progress_bar['value'] = 0

        if self.batch_processor.start_processing():
            self.progress_label.config(text="处理中...")

    def pause_batch(self):
        self.batch_processor.pause()
        self.progress_label.config(text="已暂停")

    def resume_batch(self):
        self.batch_processor.resume()
        self.progress_label.config(text="处理中...")

    def cancel_batch(self):
        self.batch_processor.cancel()
        self.progress_label.config(text="已取消")

    def on_progress_update(self, progress, current_file):
        def update():
            self.progress_bar['value'] = progress
            self.progress_label.config(text=f"处理中: {os.path.basename(current_file)} ({progress:.1f}%)")
        self.root.after(0, update)

    def on_process_complete(self, success):
        def update():
            if success:
                self.progress_label.config(text="处理完成！")
                messagebox.showinfo("完成", "批量处理已完成！")
            else:
                self.progress_label.config(text="处理已取消")
        self.root.after(0, update)

    def on_log_message(self, message):
        def update():
            self.log_text.insert(tk.END, message + "\n")
            self.log_text.see(tk.END)
        self.root.after(0, update)

    def refresh_history_list(self):
        self.history_listbox.delete(0, tk.END)
        for record in self.history_manager.get_history():
            self.history_listbox.insert(tk.END, f"[{record['timestamp']}] {record['name']}")

    def apply_history_template(self):
        idx = self.history_listbox.curselection()
        if not idx:
            messagebox.showwarning("提示", "请选择一个历史模板")
            return

        history = self.history_manager.get_history()
        if idx[0] < len(history):
            record_id = history[idx[0]]['id']
            tasks = self.history_manager.get_tasks_from_record(record_id)
            self.batch_processor.clear_tasks()
            for task in tasks:
                self.batch_processor.add_task(task)
            self.refresh_queue_list()
            messagebox.showinfo("成功", f"已应用模板: {history[idx[0]]['name']}")

    def delete_history(self):
        idx = self.history_listbox.curselection()
        if not idx:
            return

        history = self.history_manager.get_history()
        if idx[0] < len(history):
            if messagebox.askyesno("确认", "确定要删除这个历史模板吗？"):
                self.history_manager.delete_record(history[idx[0]]['id'])
                self.refresh_history_list()

    def clear_history(self):
        if messagebox.askyesno("确认", "确定要清空所有历史记录吗？"):
            self.history_manager.clear_history()
            self.refresh_history_list()

    def rename_history(self):
        idx = self.history_listbox.curselection()
        if not idx:
            return

        history = self.history_manager.get_history()
        if idx[0] < len(history):
            record = history[idx[0]]
            new_name = tk.simpledialog.askstring("重命名", "请输入新名称:", initialvalue=record['name'])
            if new_name:
                self.history_manager.update_record_name(record['id'], new_name)
                self.refresh_history_list()


def main():
    try:
        from tkinter import simpledialog
        tk.simpledialog = simpledialog
    except ImportError:
        pass

    root = tk.Tk()

    style = ttk.Style()
    try:
        style.theme_use('clam')
    except:
        pass

    app = ImageBatchProcessorApp(root)
    root.mainloop()


if __name__ == '__main__':
    main()
