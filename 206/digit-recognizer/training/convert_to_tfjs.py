import argparse
import os


def main():
    parser = argparse.ArgumentParser(description='Convert Keras .h5 model to TensorFlow.js format')
    parser.add_argument('model_path', type=str, help='Path to the .h5 model file')
    args = parser.parse_args()

    if not os.path.isfile(args.model_path):
        print(f'Error: Model file not found: {args.model_path}')
        return

    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_dir = os.path.join(script_dir, '..', 'tfjs_model')
    output_abs_dir = os.path.abspath(output_dir)
    model_abs_path = os.path.abspath(args.model_path)

    print(f'Model: {model_abs_path}')
    print(f'Output: {output_abs_dir}/')
    print()
    print('Run the following command to convert:')
    print(f'  tensorflowjs_converter --input_format=keras {model_abs_path} {output_abs_dir}/')


if __name__ == '__main__':
    main()
