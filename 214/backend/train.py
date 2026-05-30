import sys
import model as model_module


def main():
    print("=" * 60)
    print("Handwriting Recognition Model Training")
    print("=" * 60)
    
    if len(sys.argv) > 1 and sys.argv[1] == 'new':
        print("\nTraining new initial model...")
        history = model_module.train_initial_model()
        if history:
            print("\nTraining completed!")
            print(f"Final accuracy: {history.history['accuracy'][-1]:.4f}")
            print(f"Final validation accuracy: {history.history['val_accuracy'][-1]:.4f}")
    else:
        print("\nRetraining with new user samples...")
        history = model_module.train_with_new_data()
        if history:
            print("\nRetraining completed!")
            print(f"Final accuracy: {history.history['accuracy'][-1]:.4f}")
        else:
            print("\nNo new samples found.")
    
    print("\nDone!")


if __name__ == '__main__':
    main()
