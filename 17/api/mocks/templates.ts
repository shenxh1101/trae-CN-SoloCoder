import type { CodeTemplate, Language } from '../../shared/types.js'

export interface CodeTemplateMock extends Omit<CodeTemplate, 'id'> {
  id?: string
}

const helloWorldTemplates: Record<Language, CodeTemplateMock> = {
  javascript: {
    language: 'javascript',
    name: 'Hello World',
    description: 'A simple Hello World program in JavaScript',
    code: `console.log('Hello, World!');`,
    category: 'introduction',
  },
  python: {
    language: 'python',
    name: 'Hello World',
    description: 'A simple Hello World program in Python',
    code: `print('Hello, World!')`,
    category: 'introduction',
  },
  go: {
    language: 'go',
    name: 'Hello World',
    description: 'A simple Hello World program in Go',
    code: `package main

import "fmt"

func main() {
    fmt.Println("Hello, World!")
}`,
    category: 'introduction',
  },
  rust: {
    language: 'rust',
    name: 'Hello World',
    description: 'A simple Hello World program in Rust',
    code: `fn main() {
    println!("Hello, World!");
}`,
    category: 'introduction',
  },
}

const quickSortTemplates: Record<Language, CodeTemplateMock> = {
  javascript: {
    language: 'javascript',
    name: 'Quick Sort',
    description: 'Quick sort algorithm implementation in JavaScript',
    code: `function quickSort(arr) {
    if (arr.length <= 1) {
        return arr;
    }

    const pivot = arr[Math.floor(arr.length / 2)];
    const left = arr.filter(x => x < pivot);
    const middle = arr.filter(x => x === pivot);
    const right = arr.filter(x => x > pivot);

    return [...quickSort(left), ...middle, ...quickSort(right)];
}

const input = [64, 34, 25, 12, 22, 11, 90];
console.log('Original:', input);
console.log('Sorted:', quickSort(input));`,
    category: 'algorithms',
  },
  python: {
    language: 'python',
    name: 'Quick Sort',
    description: 'Quick sort algorithm implementation in Python',
    code: `def quick_sort(arr):
    if len(arr) <= 1:
        return arr

    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]

    return quick_sort(left) + middle + quick_sort(right)

input_data = [64, 34, 25, 12, 22, 11, 90]
print('Original:', input_data)
print('Sorted:', quick_sort(input_data))`,
    category: 'algorithms',
  },
  go: {
    language: 'go',
    name: 'Quick Sort',
    description: 'Quick sort algorithm implementation in Go',
    code: `package main

import (
    "fmt"
)

func quickSort(arr []int) []int {
    if len(arr) <= 1 {
        return arr
    }

    pivot := arr[len(arr)/2]
    var left, middle, right []int

    for _, x := range arr {
        switch {
        case x < pivot:
            left = append(left, x)
        case x == pivot:
            middle = append(middle, x)
        case x > pivot:
            right = append(right, x)
        }
    }

    left = quickSort(left)
    right = quickSort(right)

    return append(append(left, middle...), right...)
}

func main() {
    input := []int{64, 34, 25, 12, 22, 11, 90}
    fmt.Println("Original:", input)
    fmt.Println("Sorted:", quickSort(input))
}`,
    category: 'algorithms',
  },
  rust: {
    language: 'rust',
    name: 'Quick Sort',
    description: 'Quick sort algorithm implementation in Rust',
    code: `fn quick_sort<T: Ord>(arr: &mut [T]) {
    if arr.len() <= 1 {
        return;
    }

    let pivot_idx = partition(arr);
    let (left, right) = arr.split_at_mut(pivot_idx);
    quick_sort(left);
    quick_sort(&mut right[1..]);
}

fn partition<T: Ord>(arr: &mut [T]) -> usize {
    let pivot_idx = arr.len() / 2;
    arr.swap(pivot_idx, arr.len() - 1);

    let mut store_idx = 0;
    for i in 0..arr.len() - 1 {
        if arr[i] < arr[arr.len() - 1] {
            arr.swap(i, store_idx);
            store_idx += 1;
        }
    }

    arr.swap(store_idx, arr.len() - 1);
    store_idx
}

fn main() {
    let mut input = vec![64, 34, 25, 12, 22, 11, 90];
    println!("Original: {:?}", input);
    quick_sort(&mut input);
    println!("Sorted: {:?}", input);
}`,
    category: 'algorithms',
  },
}

export const codeTemplates: CodeTemplateMock[] = [
  ...Object.values(helloWorldTemplates),
  ...Object.values(quickSortTemplates),
]

export const getTemplatesByLanguage = (language: Language): CodeTemplateMock[] => {
  return codeTemplates.filter(t => t.language === language)
}

export const getTemplatesByCategory = (category: string): CodeTemplateMock[] => {
  return codeTemplates.filter(t => t.category === category)
}

export const getTemplateByName = (language: Language, name: string): CodeTemplateMock | undefined => {
  return codeTemplates.find(t => t.language === language && t.name === name)
}

export default codeTemplates
